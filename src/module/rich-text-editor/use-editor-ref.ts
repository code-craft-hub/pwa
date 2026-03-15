'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, type MutableRefObject } from 'react';
import type { LexicalEditor } from 'lexical';
import {
  exportEditorStateToHTML,
  exportEditorStateToJSON,
  importJSONToEditor,
  importHTMLToEditor,
} from '../utils/serialization';

/**
 * A React hook that exposes a stable imperative API via a ref.
 *
 * Usage:
 * ```tsx
 * const editorRef = useRef<EditorImperativeHandle>(null);
 *
 * // Inside a child of LexicalComposer:
 * <EditorRefPlugin editorRef={editorRef} />
 *
 * // From a parent:
 * editorRef.current?.getJSON()
 * editorRef.current?.getHTML()
 * editorRef.current?.setJSON(json)
 * editorRef.current?.clear()
 * editorRef.current?.focus()
 * ```
 */
export interface EditorImperativeHandle {
  /** Returns the current editor state as a JSON string */
  getJSON: () => string;
  /** Returns the current editor state as an HTML string */
  getHTML: () => string;
  /** Sets the editor state from a JSON string */
  setJSON: (json: string) => void;
  /** Sets the editor state from an HTML string */
  setHTML: (html: string) => void;
  /** Clears all content in the editor */
  clear: () => void;
  /** Focuses the editor */
  focus: () => void;
  /** Returns the raw LexicalEditor instance (escape hatch) */
  getEditor: () => LexicalEditor;
}

interface EditorRefPluginProps {
  editorRef: MutableRefObject<EditorImperativeHandle | null>;
}

/**
 * Plugin that wires the imperative handle to the given ref.
 * Must be rendered inside a LexicalComposer.
 */
export function EditorRefPlugin({ editorRef }: EditorRefPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editorRef.current = {
      getJSON: () => exportEditorStateToJSON(editor),
      getHTML: () => exportEditorStateToHTML(editor),
      setJSON: (json) => importJSONToEditor(editor, json),
      setHTML: (html) => importHTMLToEditor(editor, html),
      clear: () => {
        editor.update(() => {
          const { $getRoot, $createParagraphNode } = require('lexical');
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
      },
      focus: () => {
        editor.focus();
      },
      getEditor: () => editor,
    };

    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  return null;
}
