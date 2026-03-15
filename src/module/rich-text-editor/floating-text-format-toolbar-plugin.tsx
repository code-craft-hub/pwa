'use client';

import { $isCodeHighlightNode } from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Code, Italic, Link, Strikethrough, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Position helper ──────────────────────────────────────────────────────────
function setFloatingElemPosition(
  targetRect: DOMRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  isLink: boolean,
  verticalGap = 10,
  horizontalOffset = 5
): void {
  const scrollerElem = anchorElem.parentElement;

  if (!targetRect || !scrollerElem) {
    floatingElem.style.opacity = '0';
    floatingElem.style.transform = 'translate(-10000px, -10000px)';
    return;
  }

  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const editorScrollerRect = scrollerElem.getBoundingClientRect();

  let top = targetRect.top - floatingElemRect.height - verticalGap + window.scrollY;
  let left =
    targetRect.left +
    (targetRect.width - floatingElemRect.width) / 2 +
    window.scrollX;

  // Clamp horizontally
  if (left < editorScrollerRect.left + horizontalOffset) {
    left = editorScrollerRect.left + horizontalOffset;
  }
  if (left + floatingElemRect.width > editorScrollerRect.right - horizontalOffset) {
    left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
  }

  // Flip below if off-screen top
  if (top < editorScrollerRect.top) {
    top = targetRect.bottom + verticalGap + window.scrollY;
  }

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function getDOMRangeRect(nativeSelection: Selection, rootElement: HTMLElement): DOMRect {
  const domRange = nativeSelection.getRangeAt(0);
  let rect;
  if (nativeSelection.anchorNode === rootElement) {
    let inner = rootElement;
    while (inner.firstElementChild != null) {
      inner = inner.firstElementChild as HTMLElement;
    }
    rect = inner.getBoundingClientRect();
  } else {
    rect = domRange.getBoundingClientRect();
  }
  return rect;
}

// ─── Floating Toolbar ─────────────────────────────────────────────────────────
function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
  setIsLinkEditMode,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  anchorElem: HTMLElement;
  isBold: boolean;
  isCode: boolean;
  isItalic: boolean;
  isLink: boolean;
  isStrikethrough: boolean;
  isUnderline: boolean;
  setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement>(null);

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: 'https://', target: '_blank' });
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink, setIsLinkEditMode]);

  const updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();
    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = window.getSelection();

    if (popupCharStylesEditorElem === null) return;

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
      setFloatingElemPosition(rangeRect, popupCharStylesEditorElem, anchorElem, isLink);
    } else {
      setFloatingElemPosition(null, popupCharStylesEditorElem, anchorElem, isLink);
    }
  }, [editor, anchorElem, isLink]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;
    const update = () => {
      editor.getEditorState().read(() => {
        updateTextFormatFloatingToolbar();
      });
    };
    window.addEventListener('resize', update);
    if (scrollerElem) scrollerElem.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      if (scrollerElem) scrollerElem.removeEventListener('scroll', update);
    };
  }, [editor, updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateTextFormatFloatingToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateTextFormatFloatingToolbar]);

  const btnClass = (active: boolean) =>
    cn(
      'p-1.5 rounded transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
    );

  return (
    <div
      ref={popupCharStylesEditorRef}
      className={cn(
        'floating-toolbar absolute top-0 left-0 z-[100]',
        'flex items-center gap-0.5 p-1',
        'rounded-lg border border-border bg-popover shadow-lg',
        'opacity-0'
      )}
    >
      {editor.isEditable() && (
        <>
          <button
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
            className={btnClass(isBold)}
            title="Bold (⌘B)"
            aria-label="Format text as bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
            className={btnClass(isItalic)}
            title="Italic (⌘I)"
            aria-label="Format text as italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
            className={btnClass(isUnderline)}
            title="Underline (⌘U)"
            aria-label="Format text with underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
            className={btnClass(isStrikethrough)}
            title="Strikethrough"
            aria-label="Format text with strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
            className={btnClass(isCode)}
            title="Inline code"
            aria-label="Insert code"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={insertLink}
            className={btnClass(isLink)}
            title="Insert link"
            aria-label="Insert link"
          >
            <Link className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── useFloatingTextFormatToolbar ─────────────────────────────────────────────
function useFloatingTextFormatToolbar(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  anchorElem: HTMLElement,
  setIsLinkEditMode: (isLinkEditMode: boolean) => void
): JSX.Element | null {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Bail if on mobile
      if (editor.isComposing()) return;
      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) return;

      const node = selection.anchor.getNode();
      let parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ''
      ) {
        setIsText($isTextNode(node) || $isLinkNode(parent));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, '');
      if (!selection.isCollapsed() && rawTextContent === '') {
        setIsText(false);
        return;
      }

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
    });
  }, [editor]);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup);
    return () => document.removeEventListener('selectionchange', updatePopup);
  }, [updatePopup]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => updatePopup()),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) setIsText(false);
      })
    );
  }, [editor, updatePopup]);

  if (!isText) return null;

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isStrikethrough={isStrikethrough}
      isUnderline={isUnderline}
      isCode={isCode}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem
  );
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
export function FloatingTextFormatToolbarPlugin({
  anchorElem = document.body,
  setIsLinkEditMode,
}: {
  anchorElem?: HTMLElement;
  setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useFloatingTextFormatToolbar(editor, anchorElem, setIsLinkEditMode);
}
