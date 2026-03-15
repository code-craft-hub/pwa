import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, type LexicalEditor } from 'lexical';

/**
 * Export the current editor state as a JSON string.
 * Safe to store in a database or localStorage.
 */
export function exportEditorStateToJSON(editor: LexicalEditor): string {
  return JSON.stringify(editor.getEditorState().toJSON());
}

/**
 * Export the current editor state as an HTML string.
 * Useful for display-only rendering outside the editor.
 */
export function exportEditorStateToHTML(editor: LexicalEditor): string {
  let html = '';
  editor.getEditorState().read(() => {
    html = $generateHtmlFromNodes(editor, null);
  });
  return html;
}

/**
 * Import a serialized JSON state back into the editor.
 * Call this after the editor is mounted.
 */
export function importJSONToEditor(editor: LexicalEditor, jsonString: string): void {
  try {
    const state = editor.parseEditorState(jsonString);
    editor.setEditorState(state);
  } catch (error) {
    console.error('[RichTextEditor] Failed to parse JSON state:', error);
  }
}

/**
 * Import an HTML string into the editor.
 * Converts DOM nodes to Lexical nodes.
 */
export function importHTMLToEditor(editor: LexicalEditor, htmlString: string): void {
  editor.update(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlString, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    const root = $getRoot();
    root.clear();
    $insertNodes(nodes);
  });
}

/**
 * Check whether a JSON string is a valid Lexical editor state.
 */
export function isValidEditorState(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed && typeof parsed === 'object' && 'root' in parsed;
  } catch {
    return false;
  }
}
