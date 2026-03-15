# RichTextEditor — FAANG-Grade Lexical Editor for Next.js

A production-ready, fully-typed rich text editor built on [Lexical](https://lexical.dev) by Meta.

---

## Features

| Category | Details |
|---|---|
| **Text Formatting** | Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Inline Code |
| **Block Types** | Paragraph, H1–H6, Blockquote, Code Block (with syntax highlighting), Bullet List, Numbered List, Checklist |
| **Links** | Auto-link URLs/emails, floating link editor with edit/open/remove |
| **Images** | Insert via URL or file upload, drag-and-drop reorder |
| **Tables** | Full table support via @lexical/table |
| **Markdown** | Shortcuts: `##` heading, `>` quote, ` ``` ` code, `- ` bullet, `1. ` ordered, `- [ ]` checklist |
| **Alignment** | Left, Center, Right, Justify, Indent, Outdent |
| **History** | Full undo/redo via HistoryPlugin |
| **Serialization** | JSON and HTML export/import utilities |
| **Imperative API** | `editorRef` with `getJSON()`, `getHTML()`, `setJSON()`, `setHTML()`, `clear()`, `focus()` |
| **Accessibility** | ARIA roles, keyboard navigation, focus management |
| **Dark Mode** | Full dark mode support via Tailwind CSS variables |
| **Read-only Mode** | Toggle with `readOnly` prop |

---

## Installation

### 1. Install Lexical packages

```bash
bash install-editor-deps.sh
# or manually:
pnpm add lexical @lexical/react @lexical/rich-text @lexical/list @lexical/code @lexical/link @lexical/markdown @lexical/html @lexical/utils @lexical/table
```

### 2. Copy the editor folder

Place the `editor/` folder at:
```
src/
└── components/
    └── editor/          ← paste here
        ├── index.ts
        ├── RichTextEditor.tsx
        ├── nodes/
        ├── plugins/
        ├── hooks/
        ├── theme/
        ├── types/
        └── utils/
```

### 3. Import global CSS once

In `app/layout.tsx` (or `pages/_app.tsx`):
```tsx
import '@/components/editor/theme/editor-styles.css';
```

---

## Usage

### Basic

```tsx
import { RichTextEditor } from '@/components/editor';

export default function Page() {
  return (
    <RichTextEditor
      placeholder="Start writing…"
      onChange={(state, editor, html) => {
        console.log('HTML:', html);
      }}
    />
  );
}
```

### With saved state (controlled)

```tsx
'use client';
import { useState } from 'react';
import { RichTextEditor } from '@/components/editor';

export default function BlogEditor() {
  const [savedJSON, setSavedJSON] = useState<string | undefined>(undefined);

  return (
    <RichTextEditor
      initialValue={savedJSON}
      onChange={(state) => setSavedJSON(JSON.stringify(state.toJSON()))}
      showWordCount
      autoFocus
    />
  );
}
```

### With imperative ref

```tsx
'use client';
import { useRef } from 'react';
import { RichTextEditor, type EditorImperativeHandle } from '@/components/editor';

export default function Page() {
  const editorRef = useRef<EditorImperativeHandle>(null);

  return (
    <>
      <RichTextEditor editorRef={editorRef} />

      <div className="flex gap-2 mt-4">
        <button onClick={() => console.log(editorRef.current?.getJSON())}>
          Export JSON
        </button>
        <button onClick={() => console.log(editorRef.current?.getHTML())}>
          Export HTML
        </button>
        <button onClick={() => editorRef.current?.clear()}>
          Clear
        </button>
      </div>
    </>
  );
}
```

### Read-only display

```tsx
<RichTextEditor
  initialValue={post.content}
  readOnly
  showWordCount={false}
/>
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialValue` | `string` | — | Serialized JSON editor state |
| `onChange` | `(state, editor, html) => void` | — | Fires on content change |
| `placeholder` | `string` | `'Start writing…'` | Placeholder text |
| `readOnly` | `boolean` | `false` | Disable editing |
| `className` | `string` | — | Extra class for the outer wrapper |
| `namespace` | `string` | `'RichTextEditor'` | Unique namespace per instance |
| `showWordCount` | `boolean` | `true` | Show word & char count footer |
| `autoFocus` | `boolean` | `false` | Focus editor on mount |
| `maxHeight` | `string` | `'600px'` | Max height before scrolling |
| `minHeight` | `string` | `'220px'` | Minimum editor height |
| `editorRef` | `MutableRefObject<EditorImperativeHandle>` | — | Imperative handle ref |

---

## Serialization Utilities

```ts
import {
  exportEditorStateToJSON,
  exportEditorStateToHTML,
  importJSONToEditor,
  importHTMLToEditor,
  isValidEditorState,
} from '@/components/editor';
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘/Ctrl + B` | Bold |
| `⌘/Ctrl + I` | Italic |
| `⌘/Ctrl + U` | Underline |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Y` / `⌘/Ctrl + Shift + Z` | Redo |
| `Tab` | Indent (in lists/code) |
| `Shift + Tab` | Outdent |
| `##` + Space | H2 heading |
| `>` + Space | Blockquote |
| ` ``` ` + Enter | Code block |
| `-` + Space | Bullet list |
| `1.` + Space | Numbered list |
| `- [ ]` + Space | Checklist |

---

## Architecture

```
editor/
├── index.ts                          ← Public API barrel
├── RichTextEditor.tsx                ← Main component (LexicalComposer root)
│
├── nodes/
│   └── image-node.tsx                ← Custom DecoratorNode for images
│
├── plugins/
│   ├── toolbar-plugin.tsx            ← Full formatting toolbar
│   ├── on-change-plugin.tsx          ← Content change subscriber
│   ├── code-highlight-plugin.tsx     ← Prism syntax highlighting
│   ├── auto-link-plugin.tsx          ← URL/email auto-linking
│   ├── images-plugin.tsx             ← Image insert + drag-drop
│   ├── floating-link-editor-plugin.tsx    ← Floating link popover
│   ├── floating-text-format-toolbar-plugin.tsx  ← Selection toolbar
│   └── word-count-plugin.tsx         ← Word/char counter
│
├── components/
│   ├── image-component.tsx           ← Lazy-loaded image renderer
│   └── insert-image-dialog.tsx       ← URL/upload dialog
│
├── hooks/
│   └── use-editor-ref.ts             ← Imperative handle + EditorRefPlugin
│
├── theme/
│   ├── editor-theme.ts               ← Lexical theme (Tailwind classes)
│   └── editor-styles.css             ← Global CSS (import once in layout)
│
├── types/
│   └── index.ts                      ← Shared TypeScript types
│
└── utils/
    └── serialization.ts              ← JSON/HTML import & export helpers
```
