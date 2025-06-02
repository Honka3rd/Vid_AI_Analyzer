import { Observable } from "rxjs";
import { CaptionDelta } from "./types";

export interface TranscriptExtractor {
  /**
   * extract video caption
   */
  readonly id: string;
  onInit(): TranscriptExtractor;
  onDestroy(): void;
  observable$(): Observable<CaptionDelta[]>;
  captions(): CaptionDelta;
  isWatching(): boolean;
}
