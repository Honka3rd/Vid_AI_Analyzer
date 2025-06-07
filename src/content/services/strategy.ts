import { memoize } from "lodash";
import { catchError, of, Subscription, tap } from "rxjs";
import { Resolver } from "./resolver";
import { TranscriptExtractor } from "./TranscriptExtractor";

export type ListenerParams = {
  message: any;
  sender: chrome.runtime.MessageSender;
  send: (response?: any) => void;
  extractor: TranscriptExtractor;
};

export type Listener = (
  message: any,
  sender: chrome.runtime.MessageSender,
  send: (response?: any) => void
) => void;

export type CaptionProcessCallback = (msg: string[]) => string;

export class Strategy {
  private subscription?: Subscription;
  private extractor: TranscriptExtractor | null = null;
  private readonly aborter = new AbortController();

  listen() {
    const extractor = this.resolver.resolve(window.location.href);
    if (!extractor) {
      return;
    }
    this.extractor = extractor.onInit();
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        this.subscription = this.process$().subscribe();
      },
      { signal: this.aborter.signal }
    );
  }

  private process$() {
    const extractor = this.extractor;
    if (!extractor) {
      return of([]);
    }
    return extractor.observable$().pipe(
      tap((captions) => {
        console.log("Captions extracted:", captions);
      }),
      catchError((error) => {
        return of([]).pipe(
          tap(() => {
            console.error(error);
          })
        );
      })
    );
  }

  private constructor(private readonly resolver: Resolver) {}

  destroy() {
    this.subscription?.unsubscribe();
    this.extractor?.onDestroy();
    this.aborter.abort();
  }

  static readonly singleton = memoize(() => new Strategy(Resolver.singleton()));
}
