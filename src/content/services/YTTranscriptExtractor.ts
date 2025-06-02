import { clone, isEmpty, isEqual, memoize } from "lodash";
import $ from "jquery";
import { TranscriptExtractor } from "./TranscriptExtractor";
import { Nullable } from "../../types/nullable";
import {
  BehaviorSubject,
  distinctUntilChanged,
  from,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { CaptionDelta } from "./types";
import { Hosts } from "../../shared/hosts";

class YTTranscriptExtractor implements TranscriptExtractor {
  public readonly id: string = Hosts.YOUTUBE;
  public static readonly CONTAINER_ID = "#tp-caption-window-container";
  public static readonly CAPTION_LOCATOR =
    ".caption-visual-line > .ytp-caption-segment";
  private static readonly timeout = 1000 * 60 * 2;

  private observer: Nullable<MutationObserver> = null;
  private subject: Nullable<BehaviorSubject<CaptionDelta>> = null;
  private container: Nullable<Element> = null;
  private watching = false;

  private getContainer() {
    if (this.container) {
      return this.container;
    }
    this.container = document.querySelector(YTTranscriptExtractor.CONTAINER_ID);
    return this.container;
  }

  private texts(container: Element | null): CaptionDelta {
    if (!container) {
      console.warn("YT caption container not found.");
    }
    const segments = Array.from(
      container
        ? container.querySelectorAll(YTTranscriptExtractor.CAPTION_LOCATOR)
        : []
    );
    return {
      time: Date.now(),
      lines: segments
        .map((s) => s.textContent?.trim())
        .filter((s) => !isEmpty(s)) as string[],
    };
  }

  private waitTargetMount() {
    const container = this.getContainer();
    if (container) {
      return of(container);
    }

    return from(
      new Promise<HTMLElement>((resolve, reject) => {
        const id = setTimeout(() => {
          reject(
            "Element is not found after " + YTTranscriptExtractor.timeout + "ms"
          );
          clearTimeout(id);
        }, YTTranscriptExtractor.timeout);
        const onMountObserver = new MutationObserver(([record]) => {
          try {
            const found = Array.from(record.addedNodes).find(
              (node) =>
                $(node).is(YTTranscriptExtractor.CONTAINER_ID) ||
                $(node).has(YTTranscriptExtractor.CONTAINER_ID).length
            );
            if (found) {
              clearTimeout(id);
              resolve(found as HTMLElement);
              return;
            }
          } catch (error) {
            reject(error);
          } finally {
            clearTimeout(id);
            onMountObserver.disconnect();
          }
        });
        onMountObserver.observe(document.body),
          {
            childList: true,
            subtree: true,
          };
      })
    );
  }

  onInit() {
    this.subject = new BehaviorSubject(this.texts(this.getContainer()));
    this.observer = new MutationObserver(() => {
      this.subject?.next(this.texts(this.getContainer()));
    });
    this.watching = true;
    return this;
  }

  onDestroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.container = null;
    this.watching = false;
    console.log("[YTTranscriptExtractor] Stopped watching captions.");
  }

  observable$() {
    return this.waitTargetMount().pipe(
      tap((container) => {
        this.container = container;
      }),
      tap((container) => {
        this.observer?.observe(container, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }),
      switchMap((container) => {
        const subject = this.subject;
        if (!subject) {
          return throwError(() => new Error("Extractor is not initiated"));
        }
        subject.next(this.texts(container));
        return subject.pipe(distinctUntilChanged(isEqual));
      })
    );
  }

  captions(): CaptionDelta {
    if (this.subject) {
      return clone(this.subject.value);
    }
    return {
      time: Date.now(),
      lines: [],
    };
  }

  isWatching(): boolean {
    return this.watching;
  }

  static readonly singleton = memoize(() => new YTTranscriptExtractor());
}

export default YTTranscriptExtractor;
