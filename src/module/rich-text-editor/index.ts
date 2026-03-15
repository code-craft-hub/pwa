/**
 * @module @/components/editor
 *
 * Public API surface for the RichTextEditor component suite.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Install dependencies (run once):
 *    pnpm add lexical @lexical/react @lexical/rich-text @lexical/list
 *            @lexical/code @lexical/link @lexical/markdown @lexical/html
 *            @lexical/utils @lexical/table
 *
 * 2. Import the global CSS once in your root layout:
 *    import '@/components/editor/theme/editor-styles.css';
 *
 * 3. Use the component:
 *    import { RichTextEditor } from '@/components/editor';
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exports
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Main component ────────────────────────────────────────────────────────────
export { RichTextEditor } from './RichTextEditor';

// ── Imperative handle (for useRef) ────────────────────────────────────────────
export type { EditorImperativeHandle } from './hooks/use-editor-ref';
export { EditorRefPlugin } from './hooks/use-editor-ref';

// ── Serialization utilities ───────────────────────────────────────────────────
export {
  exportEditorStateToJSON,
  exportEditorStateToHTML,
  importJSONToEditor,
  importHTMLToEditor,
  isValidEditorState,
} from './utils/serialization';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  RichTextEditorProps,
  BlockType,
  ToolbarState,
  ElementFormatType,
  ImagePayload,
} from './types';

// ── Commands (for programmatic editor control) ────────────────────────────────
export { INSERT_IMAGE_COMMAND } from './plugins/images-plugin';

// ── Individual plugins (for advanced / custom compositions) ──────────────────
export { OnChangePlugin } from './plugins/on-change-plugin';
export { ToolbarPlugin } from './plugins/toolbar-plugin';
export { CodeHighlightPlugin } from './plugins/code-highlight-plugin';
export { AutoLinkPlugin } from './plugins/auto-link-plugin';
export { ImagesPlugin } from './plugins/images-plugin';
export { WordCountPlugin } from './plugins/word-count-plugin';
export { FloatingLinkEditorPlugin } from './plugins/floating-link-editor-plugin';
export { FloatingTextFormatToolbarPlugin } from './plugins/floating-text-format-toolbar-plugin';

// ── Nodes (for custom node registration) ─────────────────────────────────────
export { ImageNode, $createImageNode, $isImageNode } from './nodes/image-node';

// ── Theme ─────────────────────────────────────────────────────────────────────
export { EditorTheme } from './theme/editor-theme';
