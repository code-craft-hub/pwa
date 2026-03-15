import type { EditorThemeClasses } from 'lexical';

/**
 * FAANG-grade Lexical editor theme.
 * All classes map to Tailwind utilities that are globally available.
 * We use `editor-*` prefixed classes for styles requiring custom CSS
 * (defined in editor-styles.css).
 */
export const EditorTheme: EditorThemeClasses = {
  root: 'editor-root outline-none min-h-full px-4 py-3 text-base leading-relaxed text-foreground caret-primary',

  // ─── Block Elements ─────────────────────────────────────────────────────────
  paragraph: 'editor-paragraph my-1 leading-7',

  heading: {
    h1: 'editor-h1 text-4xl font-bold tracking-tight mt-6 mb-2 text-foreground',
    h2: 'editor-h2 text-3xl font-semibold tracking-tight mt-5 mb-2 text-foreground',
    h3: 'editor-h3 text-2xl font-semibold mt-4 mb-2 text-foreground',
    h4: 'editor-h4 text-xl font-semibold mt-3 mb-1 text-foreground',
    h5: 'editor-h5 text-lg font-semibold mt-2 mb-1 text-foreground',
    h6: 'editor-h6 text-base font-semibold mt-2 mb-1 text-muted-foreground',
  },

  quote:
    'editor-quote my-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md',

  // ─── Code ───────────────────────────────────────────────────────────────────
  code: 'editor-code-block relative block bg-muted/60 dark:bg-muted/40 rounded-lg p-4 my-4 font-mono text-sm leading-relaxed overflow-x-auto border border-border',
  codeHighlight: {
    atrule: 'text-[#07a] dark:text-[#4dc0b5]',
    attr: 'text-[#07a] dark:text-[#4dc0b5]',
    boolean: 'text-[#905] dark:text-[#f98db0]',
    builtin: 'text-[#690] dark:text-[#a4e2a4]',
    cdata: 'text-[slategray] dark:text-[#8899aa]',
    char: 'text-[#690] dark:text-[#a4e2a4]',
    class: 'text-[#dd4a68] dark:text-[#f8908f]',
    'class-name': 'text-[#dd4a68] dark:text-[#f8908f]',
    comment: 'text-[slategray] dark:text-[#8899aa] italic',
    constant: 'text-[#905] dark:text-[#f98db0]',
    deleted: 'text-[#905] dark:text-[#f98db0]',
    doctype: 'text-[slategray] dark:text-[#8899aa]',
    entity: 'text-[#9a6e3a] dark:text-[#e4b87a] cursor-help',
    function: 'text-[#dd4a68] dark:text-[#f8908f]',
    important: 'text-[#e90] dark:text-[#f0c674] font-bold',
    inserted: 'text-[#690] dark:text-[#a4e2a4]',
    keyword: 'text-[#07a] dark:text-[#7ec8e3] font-medium',
    namespace: 'text-[#9a6e3a] dark:text-[#e4b87a]',
    number: 'text-[#905] dark:text-[#f98db0]',
    operator: 'text-[#9a6e3a] dark:text-[#e4b87a]',
    prolog: 'text-[slategray] dark:text-[#8899aa]',
    property: 'text-[#905] dark:text-[#f98db0]',
    punctuation: 'text-[#999] dark:text-[#999]',
    regex: 'text-[#e90] dark:text-[#f0c674]',
    selector: 'text-[#690] dark:text-[#a4e2a4]',
    string: 'text-[#690] dark:text-[#a4e2a4]',
    symbol: 'text-[#905] dark:text-[#f98db0]',
    tag: 'text-[#905] dark:text-[#f98db0]',
    url: 'text-[#9a6e3a] dark:text-[#e4b87a]',
    variable: 'text-[#e90] dark:text-[#f0c674]',
  },

  // ─── Inline Styles ─────────────────────────────────────────────────────────
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline underline-offset-2',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-muted/70 dark:bg-muted/50 text-primary font-mono text-[0.875em] rounded px-[0.3em] py-[0.1em] border border-border/50',
    subscript: 'sub text-sm',
    superscript: 'super text-sm',
    highlight: 'bg-yellow-200/80 dark:bg-yellow-500/30 rounded-sm px-0.5',
  },

  // ─── Link ──────────────────────────────────────────────────────────────────
  link: 'editor-link text-primary underline underline-offset-2 hover:text-primary/80 transition-colors cursor-pointer',

  // ─── Lists ─────────────────────────────────────────────────────────────────
  list: {
    nested: {
      listitem: 'editor-nested-listitem list-none',
    },
    ol: 'editor-ol my-2 ml-6 list-decimal space-y-0.5',
    ul: 'editor-ul my-2 ml-6 list-disc space-y-0.5',
    listitem: 'editor-listitem leading-7',
    listitemChecked: 'editor-listitem-checked line-through text-muted-foreground',
    listitemUnchecked: 'editor-listitem-unchecked',
    olDepth: [
      'list-decimal',
      'list-[upper-alpha]',
      'list-[lower-alpha]',
      'list-[upper-roman]',
      'list-[lower-roman]',
    ],
  },

  // ─── Table ─────────────────────────────────────────────────────────────────
  table:
    'editor-table w-full my-4 border-collapse border border-border rounded-lg overflow-hidden',
  tableCell:
    'editor-table-cell border border-border px-3 py-2 text-sm min-w-[100px] align-top relative',
  tableCellHeader:
    'editor-table-cell-header bg-muted font-semibold border border-border px-3 py-2 text-sm text-left',
  tableRow: 'editor-table-row even:bg-muted/30',
  tableSelected: 'editor-table-selected',
  tableScrollableWrapper: 'overflow-x-auto w-full',

  // ─── Selection ──────────────────────────────────────────────────────────────
  characterLimit: 'editor-character-limit',

  // ─── Indent ────────────────────────────────────────────────────────────────
  indent: 'editor-indent',

  // ─── Horizontal Rule ───────────────────────────────────────────────────────
  hr: 'editor-hr border-none border-t border-border my-4',

  // ─── Image ─────────────────────────────────────────────────────────────────
  image: 'editor-image max-w-full rounded-md',
};
