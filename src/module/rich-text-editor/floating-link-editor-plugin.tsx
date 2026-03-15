'use client';

import { $isAutoLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Utilities ────────────────────────────────────────────────────────────────
function getSelectedNode(selection: ReturnType<typeof $getSelection>) {
  if (!$isRangeSelection(selection)) return null;
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) return anchorNode;
  return anchor.isBefore(focus) ? anchorNode : focusNode;
}

function setFloatingElemPositionForLinkEditor(
  targetRect: DOMRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
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

  let top = targetRect.top - verticalGap - floatingElemRect.height + window.scrollY;
  let left = targetRect.left - horizontalOffset + window.scrollX;

  if (left + floatingElemRect.width > editorScrollerRect.right) {
    left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
  }
  if (top < editorScrollerRect.top) {
    top = targetRect.bottom + verticalGap + window.scrollY;
  }

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

// ─── Floating Link Editor ─────────────────────────────────────────────────────
function FloatingLinkEditor({
  editor,
  isLink,
  setIsLink,
  anchorElem,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor;
  isLink: boolean;
  setIsLink: (isLink: boolean) => void;
  anchorElem: HTMLElement;
  isLinkEditMode: boolean;
  setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}): JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [editedLinkUrl, setEditedLinkUrl] = useState('https://');
  const [lastSelection, setLastSelection] = useState<ReturnType<typeof $getSelection>>(null);

  const $updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const linkParent = $findMatchingParent(node!, $isLinkNode);
      if (linkParent) {
        setLinkUrl(linkParent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl((node as any).getURL());
      } else {
        setLinkUrl('');
      }
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (!editorElem) return;

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode) &&
      editor.isEditable()
    ) {
      const domRect = nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
      if (domRect != null) {
        domRect.x += 40;
        setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem);
      }
      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      if (rootElement !== null) {
        setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
      }
      setLastSelection(null);
      setIsLinkEditMode(false);
      setLinkUrl('');
    }
  }, [anchorElem, editor, setIsLinkEditMode]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;
    const update = () => {
      editor.getEditorState().read(() => {
        $updateLinkEditor();
      });
    };
    window.addEventListener('resize', update);
    if (scrollerElem) scrollerElem.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      if (scrollerElem) scrollerElem.removeEventListener('scroll', update);
    };
  }, [anchorElem.parentElement, editor, $updateLinkEditor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateLinkEditor();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateLinkEditor();
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink) {
            setIsLink(false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, $updateLinkEditor, setIsLink, isLink]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateLinkEditor();
    });
  }, [editor, $updateLinkEditor]);

  useEffect(() => {
    if (isLinkEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLinkEditMode, isLink]);

  const monitorInputInteraction = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLinkSubmission();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  const handleLinkSubmission = () => {
    if (lastSelection !== null) {
      if (linkUrl !== '') {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
          url: sanitizeUrl(editedLinkUrl),
          target: '_blank',
          rel: 'noopener noreferrer',
        });
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const parent = getSelectedNode(selection)?.getParent();
            if ($isAutoLinkNode(parent)) {
              const linkNode = parent;
              linkNode.replace(linkNode, true);
            }
          }
        });
      }
      setEditedLinkUrl('https://');
      setIsLinkEditMode(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedLinkUrl(linkUrl);
    setIsLinkEditMode(false);
  };

  return (
    <div
      ref={editorRef}
      className={cn(
        'floating-toolbar absolute top-0 left-0 z-[100] flex items-center',
        'rounded-lg border border-border bg-popover shadow-lg',
        'p-1 gap-0.5 min-w-[280px]',
        !isLink && 'hidden'
      )}
    >
      {isLink ? (
        isLinkEditMode ? (
          <>
            <input
              ref={inputRef}
              className="link-input flex-1 min-w-0 bg-transparent border-none outline-none text-sm px-2 py-1 text-foreground placeholder:text-muted-foreground"
              value={editedLinkUrl}
              onChange={(e) => setEditedLinkUrl(e.target.value)}
              onKeyDown={monitorInputInteraction}
              placeholder="https://example.com"
            />
            <button
              onClick={handleCancelEdit}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleLinkSubmission}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Confirm"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <a
              href={sanitizeUrl(linkUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 text-sm px-2 py-1 text-primary underline truncate hover:text-primary/80 transition-colors"
            >
              {linkUrl}
            </a>
            <button
              onClick={() => {
                setEditedLinkUrl(linkUrl);
                setIsLinkEditMode(true);
              }}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Edit link"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <a
              href={sanitizeUrl(linkUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
              }}
              className="p-1.5 rounded hover:bg-accent text-destructive hover:text-destructive/80 transition-colors"
              title="Remove link"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )
      ) : null}
    </div>
  );
}

function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'javascript:') return 'about:blank';
    return url;
  } catch {
    return `https://${url}`;
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
export function FloatingLinkEditorPlugin({
  anchorElem = document.body,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  anchorElem?: HTMLElement;
  isLinkEditMode: boolean;
  setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLink, setIsLink] = useState(false);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  useEffect(() => {
    return activeEditor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const node = getSelectedNode(selection);
          const linkParent = $findMatchingParent(node!, $isLinkNode);
          const autoLinkParent = $findMatchingParent(node!, $isAutoLinkNode);
          if (autoLinkParent != null && linkParent == null) {
            setIsLink(false);
          } else {
            setIsLink($isLinkNode(linkParent) || $isLinkNode(node));
          }
        }
      });
    });
  }, [activeEditor]);

  return createPortal(
    <FloatingLinkEditor
      editor={activeEditor}
      isLink={isLink}
      anchorElem={anchorElem}
      setIsLink={setIsLink}
      isLinkEditMode={isLinkEditMode}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem
  );
}
