import { clone, isEmpty, isEqual, isUndefined, last, memoize } from "lodash";
import $ from "jquery";
import { TranscriptExtractor } from "./TranscriptExtractor";
import { Nullable } from "../../types/nullable";
import {
  BehaviorSubject,
  distinctUntilChanged,
  from,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { CaptionDelta } from "./types";
import { Hosts } from "../../shared/hosts";

class YTTranscriptExtractor implements TranscriptExtractor {
  public readonly id: string = Hosts.YOUTUBE;
  public static readonly CONTAINER_ID = "#ytp-caption-window-container";
  public static readonly CONTAINER_SELECTOR = "caption-visual-line";
  public static readonly TEXT_SELECTOR = "ytp-caption-segment";
  public static readonly CAPTION_LOCATOR = `.${YTTranscriptExtractor.CONTAINER_SELECTOR} > .${YTTranscriptExtractor.TEXT_SELECTOR}`;
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
      return {
        time: Date.now(),
        lines: [],
      };
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
        let onMountObserver: MutationObserver;
        const id = setTimeout(() => {
          reject(
            "Element is not found after " + YTTranscriptExtractor.timeout + "ms"
          );
          clearTimeout(id);
          onMountObserver.disconnect();
        }, YTTranscriptExtractor.timeout);
        onMountObserver = new MutationObserver(([record]) => {
          try {
            const found = Array.from(record.addedNodes).find(
              (node) =>
                $(node).is(YTTranscriptExtractor.CONTAINER_ID) ||
                $(node).has(YTTranscriptExtractor.CONTAINER_ID).length
            );
            if (found) {
              clearTimeout(id);
              resolve(found as HTMLElement);
              onMountObserver.disconnect();
              return;
            }
          } catch (error) {
            reject(error);
          }
        });
        onMountObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      })
    );
  }

  private extract(records: MutationRecord[]) {
    const record = last(records)
    if (isUndefined(record)) {
      return [];
    }
    return Array.from(record.addedNodes).filter((node) => {
      return node.nodeType === Node.TEXT_NODE;
    });
  }

  private toDelta(captionNodeList: Node[]) {
    return {
      time: Date.now(),
      lines: captionNodeList
        .map((node) => node.textContent)
        .filter((text) => !isEmpty(text)) as string[],
    };
  }

  onInit() {
    this.subject = new BehaviorSubject(this.texts(this.getContainer()));
    this.observer = new MutationObserver((records) => {
      if (!records.length) {
        return;
      }
      const captionNodeList = this.extract(records);
      if (isEmpty(captionNodeList)) {
        return;
      }
      this.subject!.next(this.toDelta(captionNodeList));
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

  processor$(): Observable<CaptionDelta> {
    const subject = this.subject;
    if (!subject) {
      return throwError(() => new Error("Extractor is not initiated"));
    }
    return subject.pipe(distinctUntilChanged(isEqual));
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
        });
      }),
      switchMap(() => this.processor$())
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
