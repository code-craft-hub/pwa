'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getTextContent } from 'lexical';
import { useEffect, useState } from 'react';

export function WordCountPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        setCharCount(text.length);
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        setWordCount(words);
      });
    });
  }, [editor]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground border-t border-border bg-muted/20 rounded-b-xl select-none">
      <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
      <span>·</span>
      <span>{charCount} {charCount === 1 ? 'character' : 'characters'}</span>
    </div>
  );
}
