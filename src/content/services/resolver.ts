import { isEmpty, memoize } from "lodash";
import { TranscriptExtractor } from "./TranscriptExtractor";
import YTTranscriptExtractor from "./YTTranscriptExtractor";
import { Hosts } from "../../shared/hosts";

export class Resolver {
  private readonly mapper = new Map<string, () => TranscriptExtractor>([
    [Hosts.YOUTUBE, () => new YTTranscriptExtractor()],
  ]);

  private match(url: string, host: string): boolean {
    return url.includes(host);
  }

  resolve(url: string) {
    if (isEmpty(url)) {
      return null;
    }
    const factory = Array.from(this.mapper.entries()).find(([k]) =>
      this.match(url, k)
    )?.[1];
    return factory ? factory() : null;
  }

  static readonly singleton = memoize(() => new Resolver());
}
