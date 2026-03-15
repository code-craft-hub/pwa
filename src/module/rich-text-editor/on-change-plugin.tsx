'use client';

import { $generateHtmlFromNodes } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type EditorState, type LexicalEditor } from 'lexical';
import { useEffect } from 'react';

interface OnChangePluginProps {
  onChange: (editorState: EditorState, editor: LexicalEditor, html: string) => void;
  /**
   * If true, the onChange callback fires on every keystroke.
   * If false (default), it fires only when the editor state actually changes.
   */
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
}

/**
 * Subscribes to Lexical update events and forwards the serializable
 * EditorState, the raw LexicalEditor instance, and a pre-rendered HTML
 * string to the consumer's onChange handler.
 *
 * Designed for zero-overhead debouncing: the updateListener is only
 * triggered when meaningful content changes occur, not on selection moves.
 */
export function OnChangePlugin({
  onChange,
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = true,
}: OnChangePluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
        // Skip history-only updates (e.g. undo/redo tagging) if requested
        if (ignoreHistoryMergeTagChange && tags.has('history-merge')) return;

        // Skip pure selection changes if requested
        if (
          ignoreSelectionChange &&
          dirtyElements.size === 0 &&
          dirtyLeaves.size === 0
        ) {
          return;
        }

        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor, null);
          onChange(editorState, editor, html);
        });
      }
    );
  }, [editor, ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange]);

  return null;
}
