import { memoize } from "lodash";
import {
  map,
  of,
  Subject,
  Subscription,
  switchMap
} from "rxjs";
import { Actions } from "../../shared/actions";
import { Resolver } from "./resolver";
import { TranscriptExtractor } from "./TranscriptExtractor";
import { CaptionDelta } from "./types";

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
  private readonly message$ = new Subject<any>();
  private subscription?: Subscription;
  private destroyer?: () => void;
  private sender?: (response?: any) => void;

  setSender(sender: (response?: any) => void) { 
    this.sender = sender;
    return this;
  }

  accept(message: any) {
    if (message.type === Actions.GET_TRANSCRIPT) {
      const extractor = Resolver.singleton().resolve(message.url);
      if (!extractor) {
        return;
      }
      this.message$.next(message);
    }
  }

  private process$() {
    return this.message$.pipe(
      map((message) => {
        const extractor = this.resolver.resolve(message.url);
        const initialized = extractor?.onInit();
        this.destroyer = () => initialized?.onDestroy();
        return initialized ? initialized.observable$() : of<CaptionDelta[]>([]);
      }),
      switchMap((delta$) => delta$)
    );
  }

  private constructor(private readonly resolver: Resolver) {
    this.subscription = this.process$().subscribe((deltas) => {
      if (this.sender) {
        this.sender(deltas);
      }
    });
  }

  destroy() {
    this.subscription?.unsubscribe();
    this.destroyer?.();
  }

  static readonly singleton = memoize(() => new Strategy(Resolver.singleton()));
}
