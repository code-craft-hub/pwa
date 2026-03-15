'use client';

import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, getLanguageFriendlyName } from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRulePlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Indent,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Outdent,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  Underline,
  Undo2,
} from 'lucide-react';
import { INSERT_IMAGE_COMMAND } from '../plugins/images-plugin';
import { InsertImageDialog } from '../components/insert-image-dialog';
import type { BlockType, ElementFormatType } from '../types';
import { BLOCK_TYPE_LABELS } from '../types';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const CODE_LANGUAGE_OPTIONS: [string, string][] = Object.entries(
  CODE_LANGUAGE_FRIENDLY_NAME_MAP
).sort(([, a], [, b]) => a.localeCompare(b));

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSelectedNode(selection: ReturnType<typeof $getSelection>) {
  if (!$isRangeSelection(selection)) return null;
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (anchorNode === focusNode) return anchorNode;
  return anchor.isBefore(focus) ? anchorNode : focusNode;
}

function blockTypeToIcon(blockType: BlockType): JSX.Element {
  const cls = 'h-4 w-4';
  switch (blockType) {
    case 'paragraph': return <Pilcrow className={cls} />;
    case 'h1': return <Heading1 className={cls} />;
    case 'h2': return <Heading2 className={cls} />;
    case 'h3': return <Heading3 className={cls} />;
    case 'h4': case 'h5': case 'h6': return <Type className={cls} />;
    case 'quote': return <Quote className={cls} />;
    case 'code': return <Code2 className={cls} />;
    case 'bullet': return <List className={cls} />;
    case 'number': return <ListOrdered className={cls} />;
    case 'check': return <ListChecks className={cls} />;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Divider() {
  return <div className="w-px h-5 bg-border shrink-0 mx-0.5" />;
}

function ToolbarBtn({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center rounded-md p-1.5 text-sm transition-colors duration-150 shrink-0',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

// ─── Block Type Dropdown ──────────────────────────────────────────────────────
function BlockTypeDropdown({
  editor,
  blockType,
  disabled,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  blockType: BlockType;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatBlock = (type: BlockType) => {
    setOpen(false);
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === 'quote') {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === 'code') {
        $setBlocksType(selection, () => {
          const { $createCodeNode } = require('@lexical/code');
          return $createCodeNode();
        });
      } else if (type.startsWith('h')) {
        $setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
      }
    });

    if (type === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else if (type === 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else if (type === 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    }
  };

  const items: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'h4', 'quote', 'code', 'bullet', 'number', 'check'];

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-40'
        )}
        title="Block type"
      >
        {blockTypeToIcon(blockType)}
        <span className="hidden sm:block min-w-[70px] text-left">
          {BLOCK_TYPE_LABELS[blockType]}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg py-1 overflow-hidden">
          {items.map((type) => (
            <button
              key={type}
              onClick={() => formatBlock(type)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground text-left',
                blockType === type && 'bg-accent/50 text-accent-foreground font-medium'
              )}
            >
              {blockTypeToIcon(type)}
              {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Font Size Selector ───────────────────────────────────────────────────────
function FontSizeSelector({
  editor,
  fontSize,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  fontSize: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(fontSize);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setValue(fontSize); }, [fontSize]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyFontSize = (size: string) => {
    setOpen(false);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.formatText('fontSize' as any, size);
      }
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground min-w-[56px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        title="Font size"
      >
        <span>{value || '16px'}</span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-24 rounded-lg border border-border bg-popover shadow-lg py-1 overflow-auto max-h-48">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => applyFontSize(size)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                value === size && 'bg-accent/50 font-medium'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────
const COLORS = [
  '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#ffffff',
];

function ColorPicker({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={label}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <Type className="h-4 w-4" />
        <div
          className="h-1 w-5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 p-2 rounded-lg border border-border bg-popover shadow-lg">
          <div className="grid grid-cols-5 gap-1 mb-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={cn(
                  'h-6 w-6 rounded-md border-2 transition-transform hover:scale-110',
                  color === c ? 'border-primary scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 rounded cursor-pointer border border-border"
            title="Custom color"
          />
        </div>
      )}
    </div>
  );
}

// ─── Align Dropdown ───────────────────────────────────────────────────────────
function AlignDropdown({
  editor,
  elementFormat,
  disabled,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  elementFormat: ElementFormatType;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const alignments: { type: ElementFormatType; icon: JSX.Element; label: string }[] = [
    { type: 'left', icon: <AlignLeft className="h-4 w-4" />, label: 'Left Align' },
    { type: 'center', icon: <AlignCenter className="h-4 w-4" />, label: 'Center Align' },
    { type: 'right', icon: <AlignRight className="h-4 w-4" />, label: 'Right Align' },
    { type: 'justify', icon: <AlignJustify className="h-4 w-4" />, label: 'Justify' },
  ];

  const current = alignments.find((a) => a.type === elementFormat) ?? alignments[0];

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-40'
        )}
        title="Alignment"
      >
        {current.icon}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
          {alignments.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground text-left',
                elementFormat === type && 'bg-accent/50 font-medium'
              )}
            >
              {icon}
              {label}
            </button>
          ))}
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Indent className="h-4 w-4" /> Indent
          </button>
          <button
            onClick={() => { editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Outdent className="h-4 w-4" /> Outdent
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Insert Dropdown ──────────────────────────────────────────────────────────
function InsertDropdown({
  editor,
  onInsertImage,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  onInsertImage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        title="Insert"
      >
        <span>Insert</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
          <button
            onClick={() => { onInsertImage(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Image className="h-4 w-4" /> Image
          </button>
          <button
            onClick={() => {
              editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
          >
            <Minus className="h-4 w-4" /> Horizontal Rule
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
export function ToolbarPlugin({
  setIsLinkEditMode,
}: {
  setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);

  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [codeLanguage, setCodeLanguage] = useState('');
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');
  const [fontSize, setFontSize] = useState('16px');
  const [fontColor, setFontColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) element = anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));
      setIsRTL(false);

      const node = getSelectedNode(selection);
      const parent = node?.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type as BlockType);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type in BLOCK_TYPE_LABELS) {
            setBlockType(type as BlockType);
          }
          if ($isCodeNode(element)) {
            const language = element.getLanguage() as keyof typeof CODE_LANGUAGE_FRIENDLY_NAME_MAP;
            setCodeLanguage(language ? getLanguageFriendlyName(language) : '');
          }
        }
      }

      setElementFormat(
        ($isRootOrShadowRoot(element) ? null : (element as any).getFormatType?.()) ?? 'left'
      );
    }
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => setIsEditable(editable)),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => $updateToolbar());
      }),
      activeEditor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
        setCanUndo(payload);
        return false;
      }, COMMAND_PRIORITY_CRITICAL),
      activeEditor.registerCommand(CAN_REDO_COMMAND, (payload) => {
        setCanRedo(payload);
        return false;
      }, COMMAND_PRIORITY_CRITICAL)
    );
  }, [$updateToolbar, activeEditor, editor]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.getNodes().forEach((node) => {
            if ($isTextNode(node)) {
              Object.entries(styles).forEach(([style, value]) => {
                (node as any).setStyle?.(
                  `${(node as any).getStyle?.() ?? ''};${style}:${value}`.trim()
                );
              });
            }
          });
        }
      });
    },
    [activeEditor]
  );

  const onFontColorSelect = useCallback(
    (value: string) => {
      setFontColor(value);
      applyStyleText({ color: value });
    },
    [applyStyleText]
  );

  const onBgColorSelect = useCallback(
    (value: string) => {
      setBgColor(value);
      applyStyleText({ 'background-color': value });
    },
    [applyStyleText]
  );

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: 'https://', target: '_blank' });
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, isLink, setIsLinkEditMode]);

  const clearFormatting = useCallback(() => {
    activeEditor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const nodes = selection.getNodes();
        const extractedNodes = selection.extract();

        if (anchor.key === focus.key && anchor.offset === focus.offset) return;

        nodes.forEach((node, idx) => {
          if ($isTextNode(node)) {
            let textNode = node;
            if (idx === 0 && anchor.offset !== 0) {
              textNode = textNode.splitText(anchor.offset)[1] || textNode;
            }
            if (idx === nodes.length - 1) {
              textNode = textNode.splitText(focus.offset)[0] || textNode;
            }
            const extractedTextNode = extractedNodes[0];
            if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
              textNode = extractedTextNode;
            }
            if (textNode.__style !== '') textNode.setStyle('');
            if (textNode.__format !== 0) textNode.setFormat(0);
            node = textNode;
          }
        });
      }
    });
  }, [activeEditor]);

  const isCodeBlock = blockType === 'code';

  return (
    <>
      <div
        className={cn(
          'flex items-center flex-wrap gap-0.5 px-2 py-1.5',
          'border-b border-border bg-muted/30 rounded-t-xl',
          'sticky top-0 z-10'
        )}
        role="toolbar"
        aria-label="Formatting options"
      >
        {/* Undo / Redo */}
        <ToolbarBtn onClick={() => activeEditor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo || !isEditable} title="Undo (⌘Z)">
          <Undo2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => activeEditor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo || !isEditable} title="Redo (⌘Y)">
          <Redo2 className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Block Type */}
        <BlockTypeDropdown editor={activeEditor} blockType={blockType} disabled={!isEditable} />

        {!isCodeBlock && (
          <>
            <Divider />
            <FontSizeSelector editor={activeEditor} fontSize={fontSize} />
            <Divider />

            {/* Text Format */}
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} active={isBold} disabled={!isEditable} title="Bold (⌘B)">
              <Bold className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} active={isItalic} disabled={!isEditable} title="Italic (⌘I)">
              <Italic className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} active={isUnderline} disabled={!isEditable} title="Underline (⌘U)">
              <Underline className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} active={isStrikethrough} disabled={!isEditable} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} active={isCode} disabled={!isEditable} title="Inline Code">
              <Code className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')} active={isSubscript} disabled={!isEditable} title="Subscript">
              <Subscript className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')} active={isSuperscript} disabled={!isEditable} title="Superscript">
              <Superscript className="h-4 w-4" />
            </ToolbarBtn>

            <Divider />

            {/* Link */}
            <ToolbarBtn onClick={insertLink} active={isLink} disabled={!isEditable} title="Insert Link (⌘K)">
              <Link className="h-4 w-4" />
            </ToolbarBtn>

            <Divider />

            {/* Colors */}
            <ColorPicker color={fontColor} onChange={onFontColorSelect} label="Text Color" />

            <Divider />

            {/* Alignment */}
            <AlignDropdown editor={activeEditor} elementFormat={elementFormat} disabled={!isEditable} />

            <Divider />

            {/* Insert */}
            <InsertDropdown editor={activeEditor} onInsertImage={() => setShowImageDialog(true)} />

            <Divider />

            {/* Clear Formatting */}
            <ToolbarBtn onClick={clearFormatting} disabled={!isEditable} title="Clear Formatting">
              <RemoveFormatting className="h-4 w-4" />
            </ToolbarBtn>
          </>
        )}

        {/* Code Language (shown only in code blocks) */}
        {isCodeBlock && (
          <>
            <Divider />
            <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span>Language:</span>
              <select
                value={codeLanguage}
                onChange={(e) => {
                  const language = e.target.value;
                  setCodeLanguage(language);
                  activeEditor.update(() => {
                    if (selectedElementKey !== null) {
                      const node = $getNodeByKey(selectedElementKey);
                      if ($isCodeNode(node)) {
                        node.setLanguage(language);
                      }
                    }
                  });
                }}
                className="bg-transparent border-none outline-none text-sm cursor-pointer text-foreground"
              >
                <option value="">Plain Text</option>
                {CODE_LANGUAGE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {showImageDialog && (
        <InsertImageDialog onClose={() => setShowImageDialog(false)} />
      )}
    </>
  );
}
