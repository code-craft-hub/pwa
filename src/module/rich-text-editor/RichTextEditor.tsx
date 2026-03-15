'use client';

/**
 * RichTextEditor
 * ─────────────────────────────────────────────────────────────────────────────
 * A FAANG-grade Lexical-powered rich text editor for Next.js.
 *
 * Features
 * ────────
 * • Full formatting: bold, italic, underline, strikethrough, subscript, superscript
 * • Block types: paragraph, h1–h6, quote, code (with syntax highlighting), lists, checklists
 * • Links with floating edit popover
 * • Floating selection toolbar
 * • Image insertion (URL or file upload) with drag-and-drop support
 * • Table support
 * • Horizontal rules
 * • Markdown shortcuts (## heading, > quote, ``` code, - bullet, 1. ordered, - [ ] check)
 * • Auto-link: URLs and emails auto-convert as you type
 * • Full undo/redo history
 * • Word & character count footer
 * • JSON and HTML serialization helpers
 * • Imperative API via editorRef
 * • Read-only mode
 * • Fully typed (TypeScript)
 * • Dark mode support via CSS variables
 *
 * Quick Start
 * ───────────
 * ```tsx
 * import { RichTextEditor } from '@/components/editor';
 *
 * export default function Page() {
 *   return (
 *     <RichTextEditor
 *       placeholder="Start writing…"
 *       onChange={(state, editor, html) => console.log(html)}
 *     />
 *   );
 * }
 * ```
 *
 * With imperative ref
 * ───────────────────
 * ```tsx
 * import { useRef } from 'react';
 * import { RichTextEditor, type EditorImperativeHandle } from '@/components/editor';
 *
 * export default function Page() {
 *   const editorRef = useRef<EditorImperativeHandle>(null);
 *
 *   return (
 *     <>
 *       <RichTextEditor editorRef={editorRef} />
 *       <button onClick={() => console.log(editorRef.current?.getJSON())}>
 *         Export JSON
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import {
  HorizontalRuleNode,
  HorizontalRulePlugin,
} from '@lexical/react/LexicalHorizontalRulePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { type MutableRefObject, useState } from 'react';

import { ImageNode } from './nodes/image-node';
import { EditorTheme } from './theme/editor-theme';
import { AutoLinkPlugin } from './plugins/auto-link-plugin';
import { CodeHighlightPlugin } from './plugins/code-highlight-plugin';
import { FloatingLinkEditorPlugin } from './plugins/floating-link-editor-plugin';
import { FloatingTextFormatToolbarPlugin } from './plugins/floating-text-format-toolbar-plugin';
import { ImagesPlugin } from './plugins/images-plugin';
import { OnChangePlugin } from './plugins/on-change-plugin';
import { ToolbarPlugin } from './plugins/toolbar-plugin';
import { WordCountPlugin } from './plugins/word-count-plugin';
import { EditorRefPlugin, type EditorImperativeHandle } from './hooks/use-editor-ref';
import type { RichTextEditorProps } from './types';
import { cn } from '@/lib/utils';

// ─── URL validator ────────────────────────────────────────────────────────────
function validateUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(protocol);
  } catch {
    return false;
  }
}

// ─── Node registry ────────────────────────────────────────────────────────────
const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  ImageNode,
  TableNode,
  TableCellNode,
  TableRowNode,
] as const;

// ─── Extended Props (adds editorRef) ─────────────────────────────────────────
interface RichTextEditorExtendedProps extends RichTextEditorProps {
  editorRef?: MutableRefObject<EditorImperativeHandle | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function RichTextEditor({
  initialValue,
  onChange,
  placeholder = 'Start writing…',
  readOnly = false,
  className,
  namespace = 'RichTextEditor',
  showWordCount = true,
  autoFocus = false,
  maxHeight = '600px',
  minHeight = '220px',
  editorRef,
}: RichTextEditorExtendedProps): JSX.Element {
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const onRef = (ref: HTMLDivElement | null) => {
    if (ref !== null) setFloatingAnchorElem(ref);
  };

  const initialConfig = {
    namespace,
    theme: EditorTheme,
    nodes: [...EDITOR_NODES],
    editable: !readOnly,
    // Pass the raw JSON string directly — Lexical handles deserialization
    editorState: initialValue ?? undefined,
    onError(error: Error) {
      console.error(`[RichTextEditor:${namespace}] Lexical error:`, error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          'rich-text-editor relative flex flex-col rounded-xl border border-border',
          'bg-background shadow-sm ring-offset-background transition-all duration-200',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          !readOnly && 'focus-within:border-ring/50',
          readOnly && 'opacity-90 cursor-default',
          className
        )}
      >
        {/* ── Toolbar (hidden in read-only) ───────────────────── */}
        {!readOnly && (
          <ToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
        )}

        {/* ── Content Editable Area ───────────────────────────── */}
        <div
          ref={onRef}
          className="relative flex-1 overflow-y-auto"
          style={{ maxHeight, minHeight }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-root focus:outline-none"
                style={{ minHeight }}
                aria-placeholder={placeholder}
                aria-multiline="true"
                aria-label="Rich text editor content"
                role="textbox"
                spellCheck
              />
            }
            placeholder={
              <div
                className="editor-placeholder"
                aria-hidden="true"
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {/* ── Word Count Footer ───────────────────────────────── */}
        {showWordCount && <WordCountPlugin />}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Core Plugins
          All stateless — safe to always mount
      ══════════════════════════════════════════════════════════════ */}
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <LinkPlugin validateUrl={validateUrl} />
      <HorizontalRulePlugin />
      <TabIndentationPlugin />
      <TablePlugin />
      <CodeHighlightPlugin />
      <AutoLinkPlugin />
      <ImagesPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

      {/* ── Conditional Plugins ──────────────────────────────────── */}
      {autoFocus && <AutoFocusPlugin />}
      {onChange && <OnChangePlugin onChange={onChange} />}
      {editorRef && <EditorRefPlugin editorRef={editorRef} />}

      {/* ═══════════════════════════════════════════════════════════
          Floating UI
          Depends on DOM anchor — only mount after the editor div is ready
      ══════════════════════════════════════════════════════════════ */}
      {floatingAnchorElem && !readOnly && (
        <>
          <FloatingTextFormatToolbarPlugin
            anchorElem={floatingAnchorElem}
            setIsLinkEditMode={setIsLinkEditMode}
          />
          <FloatingLinkEditorPlugin
            anchorElem={floatingAnchorElem}
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
          />
        </>
      )}
    </LexicalComposer>
  );
}
