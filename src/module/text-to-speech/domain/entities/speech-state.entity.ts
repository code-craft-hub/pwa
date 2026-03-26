export type SpeechStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface SpeechState {
  status: SpeechStatus;
  /** Index of current chunk (1-based) */
  currentChunk?: number;
  /** Total number of chunks */
  totalChunks?: number;
  /** Currently spoken text chunk */
  currentText?: string;
  error?: string;
}
