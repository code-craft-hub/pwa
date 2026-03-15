import type { EditorState, LexicalEditor } from 'lexical';

// ─── Block Type ───────────────────────────────────────────────────────────────
export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'quote'
  | 'code'
  | 'bullet'
  | 'number'
  | 'check';

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  quote: 'Quote',
  code: 'Code Block',
  bullet: 'Bulleted List',
  number: 'Numbered List',
  check: 'Check List',
};

// ─── Alignment ────────────────────────────────────────────────────────────────
export type ElementFormatType = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end' | '';

// ─── Font Size ────────────────────────────────────────────────────────────────
export const FONT_SIZES = [
  '10px', '11px', '12px', '14px', '16px', '18px', '20px',
  '24px', '28px', '32px', '36px', '48px', '60px', '72px',
] as const;
export type FontSize = (typeof FONT_SIZES)[number];

// ─── Editor Props ─────────────────────────────────────────────────────────────
export interface RichTextEditorProps {
  /** Initial editor content as serialized JSON string */
  initialValue?: string;
  /** Callback fired on every content change */
  onChange?: (editorState: EditorState, editor: LexicalEditor, html: string) => void;
  /** Placeholder text for empty editor */
  placeholder?: string;
  /** Disable editing */
  readOnly?: boolean;
  /** Additional CSS class for the outer wrapper */
  className?: string;
  /** Namespace for the editor instance */
  namespace?: string;
  /** Whether to show the word count footer */
  showWordCount?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Max height (CSS value) before scrolling */
  maxHeight?: string;
  /** Min height (CSS value) */
  minHeight?: string;
}

// ─── Toolbar State ────────────────────────────────────────────────────────────
export interface ToolbarState {
  blockType: BlockType;
  selectedElementKey: string | null;
  fontSize: string;
  fontColor: string;
  bgColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isLink: boolean;
  isRTL: boolean;
  elementFormat: ElementFormatType;
  canUndo: boolean;
  canRedo: boolean;
}

export const INITIAL_TOOLBAR_STATE: ToolbarState = {
  blockType: 'paragraph',
  selectedElementKey: null,
  fontSize: '16px',
  fontColor: '#000000',
  bgColor: '#ffffff',
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isCode: false,
  isSubscript: false,
  isSuperscript: false,
  isLink: false,
  isRTL: false,
  elementFormat: 'left',
  canUndo: false,
  canRedo: false,
};

// ─── Image Node ───────────────────────────────────────────────────────────────
export interface ImagePayload {
  altText: string;
  src: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  key?: string;
}
