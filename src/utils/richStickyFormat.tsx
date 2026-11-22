import React from 'react';

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  const cleaned = trimmed.replace(/^\|/, '').replace(/\|$/, '').trim();
  if (!cleaned) return false;
  return cleaned.split('|').every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function splitMarkdownTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '\\' && trimmed[i + 1] === '|') {
      current += '|';
      i++;
    } else if (trimmed[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += trimmed[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Detects consecutive tab-separated (TSV) lines (common when copying tables directly
 * from ChatGPT/Gemini/Claude web UI into plain text inputs) and converts them into
 * Markdown tables (`| col1 | col2 |`).
 */
export function convertTsvBlocksToMarkdown(text: string): string {
  if (!text || !text.includes('\t')) return text;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('\t') && !line.trim().startsWith('|')) {
      const block: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].includes('\t') && !lines[j].trim().startsWith('|')) {
        const cols = lines[j].split('\t').map((c) => c.trim());
        if (cols.length >= 2) {
          block.push(cols);
          j++;
        } else {
          break;
        }
      }

      if (block.length >= 2) {
        const colCount = Math.max(...block.map((r) => r.length));
        const formatRow = (row: string[]) => {
          const padded = Array.from({ length: colCount }, (_, idx) =>
            (row[idx] ?? '').replace(/\|/g, '\\|')
          );
          return `| ${padded.join(' | ')} |`;
        };

        out.push(formatRow(block[0]));
        out.push(`| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`);
        for (let r = 1; r < block.length; r++) {
          out.push(formatRow(block[r]));
        }
        i = j;
        continue;
      }
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

function wrapInlineMarker(text: string, marker: string): string {
  if (!text) return '';
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const core = text.trim();
  if (!core) return text;
  if (core.startsWith(marker) && core.endsWith(marker) && core.length > marker.length * 2) {
    return text;
  }
  return `${leading}${marker}${core}${marker}${trailing}`;
}

function serializeHtmlInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'button') {
    return '';
  }
  if (tag === 'br') return '\n';

  const childrenText = Array.from(el.childNodes).map(serializeHtmlInline).join('');

  if (tag === 'strong' || tag === 'b') {
    return wrapInlineMarker(childrenText, '**');
  }
  if (tag === 'em' || tag === 'i') {
    return wrapInlineMarker(childrenText, '*');
  }
  if (tag === 'del' || tag === 's') {
    return wrapInlineMarker(childrenText, '~~');
  }
  if (tag === 'code') {
    const clean = childrenText.trim().replace(/`/g, '');
    return clean ? `\`${clean}\`` : '';
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') || '';
    const label = childrenText.trim();
    if (href && /^https?:\/\//i.test(href) && label) {
      return `[${label}](${href})`;
    }
    return childrenText;
  }
  if (tag === 'span') {
    const fw = el.style?.fontWeight;
    if (fw === 'bold' || fw === 'bolder' || Number(fw) >= 600) {
      return wrapInlineMarker(childrenText, '**');
    }
    const fs = el.style?.fontStyle;
    if (fs === 'italic') {
      return wrapInlineMarker(childrenText, '*');
    }
  }

  return childrenText;
}

function serializeHtmlTable(tableEl: HTMLElement): string {
  const rows: string[][] = [];
  const trList = Array.from(tableEl.querySelectorAll('tr'));
  for (const tr of trList) {
    const cells = Array.from(tr.children).filter(
      (c) => c.tagName.toLowerCase() === 'th' || c.tagName.toLowerCase() === 'td'
    );
    if (cells.length === 0) continue;
    const rowValues = cells.map((cell) =>
      Array.from(cell.childNodes)
        .map(serializeHtmlInline)
        .join('')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim()
    );
    rows.push(rowValues);
  }

  if (rows.length === 0) return '';
  const colCount = Math.max(...rows.map((r) => r.length));
  if (colCount === 0) return '';

  const formatRow = (row: string[]) =>
    `| ${Array.from({ length: colCount }, (_, idx) => row[idx] ?? '').join(' | ')} |`;

  const lines: string[] = [];
  lines.push(formatRow(rows[0]));
  lines.push(`| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`);
  for (let i = 1; i < rows.length; i++) {
    lines.push(formatRow(rows[i]));
  }
  return `\n${lines.join('\n')}\n`;
}

function serializeHtmlList(listEl: HTMLElement, ordered: boolean, depth = 0): string {
  const indent = '  '.repeat(depth);
  const items = Array.from(listEl.children).filter((c) => c.tagName.toLowerCase() === 'li');
  const lines: string[] = [];

  items.forEach((li, index) => {
    const inlineParts: string[] = [];
    const nestedLists: string[] = [];

    Array.from(li.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const cTag = (child as HTMLElement).tagName.toLowerCase();
        if (cTag === 'ul') {
          nestedLists.push(serializeHtmlList(child as HTMLElement, false, depth + 1));
          return;
        }
        if (cTag === 'ol') {
          nestedLists.push(serializeHtmlList(child as HTMLElement, true, depth + 1));
          return;
        }
      }
      inlineParts.push(serializeHtmlInline(child));
    });

    const itemText = inlineParts
      .join('')
      .replace(/\s*\n\s*/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    const prefix = ordered ? `${index + 1}. ` : '- ';
    if (itemText) {
      lines.push(`${indent}${prefix}${itemText}`);
    }
    nestedLists.forEach((nl) => {
      if (nl.trim()) lines.push(nl);
    });
  });

  return lines.join('\n');
}

function serializeHtmlBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'button') {
    return '';
  }
  if (tag === 'hr') return '\n---\n';
  if (tag === 'br') return '\n';

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const text = Array.from(el.childNodes)
      .map(serializeHtmlInline)
      .join('')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? `\n${'#'.repeat(level)} ${text}\n` : '';
  }

  if (tag === 'table') {
    return serializeHtmlTable(el);
  }
  if (tag === 'ul') {
    const content = serializeHtmlList(el, false, 0);
    return content ? `\n${content}\n` : '';
  }
  if (tag === 'ol') {
    const content = serializeHtmlList(el, true, 0);
    return content ? `\n${content}\n` : '';
  }
  if (tag === 'blockquote') {
    const inner = Array.from(el.childNodes).map(serializeHtmlBlock).join('').trim();
    if (!inner) return '';
    const quoted = inner
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    return `\n${quoted}\n`;
  }
  if (tag === 'pre') {
    const codeText = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
    return codeText ? `\n\`\`\`\n${codeText}\n\`\`\`\n` : '';
  }

  const blockTags = new Set([
    'p',
    'div',
    'section',
    'article',
    'header',
    'footer',
    'main',
    'aside',
  ]);
  if (blockTags.has(tag)) {
    const hasNestedBlocks = Array.from(el.children).some((c) => {
      const ct = c.tagName.toLowerCase();
      return (
        blockTags.has(ct) ||
        /^h[1-6]$/.test(ct) ||
        ct === 'table' ||
        ct === 'ul' ||
        ct === 'ol' ||
        ct === 'blockquote' ||
        ct === 'pre' ||
        ct === 'hr'
      );
    });

    if (hasNestedBlocks) {
      return Array.from(el.childNodes).map(serializeHtmlBlock).join('');
    }
    const inline = Array.from(el.childNodes)
      .map(serializeHtmlInline)
      .join('')
      .replace(/[ \t]+/g, ' ')
      .trim();
    return inline ? `\n${inline}\n` : '';
  }

  return serializeHtmlInline(el);
}

/**
 * Converts pasted/stored HTML from AI chats (ChatGPT, Gemini, Claude, etc.) into
 * clean Markdown preserving headings, tables, bold, italic, lists, quotes, and code.
 */
export function htmlToCleanMarkdown(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const raw = Array.from(doc.body.childNodes).map(serializeHtmlBlock).join('');
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return html;
  }
}

/**
 * Extracts clean Markdown from clipboard DataTransfer on paste, preferring semantic
 * text/html (tables, headings, bold, lists) and falling back to text/plain + TSV detection.
 */
export function clipboardToStickyMarkdown(clipboardData: DataTransfer | null): string {
  if (!clipboardData) return '';
  const html = clipboardData.getData('text/html') || '';
  const plain = (clipboardData.getData('text/plain') || '').replace(/\r\n/g, '\n');

  const hasSemanticRichTags =
    /<(h[1-6]|table|thead|tbody|tr|th|td|strong|b|em|i|ul|ol|li|blockquote|hr)\b/i.test(
      html
    );
  const hasBlockTags = /<(p|div|pre|code)\b/i.test(html);
  const plainAlreadyHasMarkdown =
    /(^|\n)\s*#{1,6}\s+|\*\*[^*\n]+\*\*|(^|\n)\s*\|.+\|\s*(\n|$)/m.test(plain);

  if (hasSemanticRichTags || (hasBlockTags && !plainAlreadyHasMarkdown)) {
    const converted = htmlToCleanMarkdown(html);
    if (converted) {
      return convertTsvBlocksToMarkdown(converted)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  return convertTsvBlocksToMarkdown(plain)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean single/multi-line plain preview for compact sticky note cards and modal titles.
 */
export function stickyContentToPlainPreview(text: string): string {
  if (!text) return '';
  let source = text;
  if (/<[a-z][\s\S]*>/i.test(source)) {
    source = htmlToCleanMarkdown(source);
  }

  return source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !isMarkdownTableSeparator(line))
    .map((line) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        return splitMarkdownTableRow(line).filter(Boolean).join(' — ');
      }
      if (line.includes('\t')) {
        return line
          .split('\t')
          .map((c) => c.trim())
          .filter(Boolean)
          .join(' — ');
      }
      return line
        .replace(/^\s*#{1,6}\s+/, '')
        .replace(/^\s*[-*+]\s+/, '• ')
        .replace(/^\s*>\s?/, '');
    })
    .join('\n')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Renders inline Markdown tokens (**bold**, *italic*, ~~strike~~, `code`, [label](url))
 */
function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const tokenRegex =
    /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+?`|~~[^~\n]+?~~|\*[^*\n]+?\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      parts.push(
        <strong key={key} className="font-extrabold text-black">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          dir="ltr"
          className="font-mono text-[0.88em] bg-black/10 px-1.5 py-0.5 rounded-md shadow-2xs mx-0.5 inline-block"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      parts.push(
        <del key={key} className="opacity-70">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-black/40 underline-offset-2 font-semibold hover:opacity-75"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function hasRichFormattingMarkers(text: string): boolean {
  return (
    /(^|\n)\s*#{1,6}\s+/.test(text) ||
    /\*\*[^*\n]+\*\*/.test(text) ||
    /(^|\n)\s*\|.+\|\s*(\n|$)/.test(text) ||
    text.includes('\t') ||
    /(^|\n)\s*([-*+•]|\d+[.)])\s+/.test(text) ||
    /<[a-z][\s\S]*>/i.test(text)
  );
}

interface RichStickyContentProps {
  content: string;
  fontSize?: 'normal' | 'large' | 'huge';
  isBold?: boolean;
}

export const RichStickyContent: React.FC<RichStickyContentProps> = ({
  content,
  fontSize = 'large',
  isBold = false,
}) => {
  // Normalize HTML content (if pasted/imported as raw HTML) and TSV tab-separated tables into Markdown
  const normalized = React.useMemo(() => {
    if (!content) return '';
    let text = content;
    if (/<(h[1-6]|table|thead|tbody|tr|th|td|strong|b|em|i|ul|ol|li|blockquote|pre|p|div|br)\b/i.test(text)) {
      text = htmlToCleanMarkdown(text);
    }
    return convertTsvBlocksToMarkdown(text).replace(/\r\n/g, '\n');
  }, [content]);

  if (!normalized.trim()) {
    return <span className="text-neutral-600 italic">بدون متن</span>;
  }

  const useAllBold = isBold && !hasRichFormattingMarkers(normalized);

  const sizeConfig =
    fontSize === 'normal'
      ? {
          body: 'text-[13.5px] sm:text-[14.5px] leading-[1.8]',
          h1: 'text-[17px] sm:text-[18.5px] leading-snug',
          h2: 'text-[16px] sm:text-[17.5px] leading-snug',
          h3: 'text-[15px] sm:text-[16px] leading-snug',
          table: 'text-[12.5px] sm:text-[13.5px]',
        }
      : fontSize === 'huge'
      ? {
          body: 'text-[17px] sm:text-[18.5px] leading-[2.0]',
          h1: 'text-[22px] sm:text-[24px] leading-snug',
          h2: 'text-[20px] sm:text-[22px] leading-snug',
          h3: 'text-[18.5px] sm:text-[20px] leading-snug',
          table: 'text-[15px] sm:text-[16px]',
        }
      : {
          body: 'text-[15px] sm:text-[16px] leading-[1.9]',
          h1: 'text-[19.5px] sm:text-[21px] leading-snug',
          h2: 'text-[18px] sm:text-[19.5px] leading-snug',
          h3: 'text-[16.5px] sm:text-[18px] leading-snug',
          table: 'text-[13.5px] sm:text-[14.5px]',
        };

  const lines = normalized.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (used as block separators)
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced code block ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <pre
          key={`b-${blockKey++}`}
          dir="ltr"
          className="w-full overflow-x-auto bg-neutral-900 text-neutral-100 rounded-xl px-3.5 py-2.5 text-left font-mono text-[12px] sm:text-[13px] leading-relaxed my-1.5 shadow-2xs"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 2. Horizontal rule --- / *** / ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<div key={`b-${blockKey++}`} className="w-full h-px bg-black/10 my-2.5" />);
      i++;
      continue;
    }

    // 3. Headings (# .. ######)
    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].replace(/\s+#+$/, '').trim();
      const headingClass =
        level === 1
          ? `${sizeConfig.h1} font-black`
          : level === 2
          ? `${sizeConfig.h2} font-black`
          : `${sizeConfig.h3} font-extrabold`;

      blocks.push(
        <div
          key={`b-${blockKey++}`}
          className={`${headingClass} text-black text-right w-full mt-2 first:mt-0 mb-0.5`}
        >
          {renderInlineMarkdown(headingText, `h-${blockKey}`)}
        </div>
      );
      i++;
      continue;
    }

    // 4. Markdown Table (| col1 | col2 | followed by | --- | --- |, or consecutive |...| lines)
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }

      if (
        tableLines.length >= 2 &&
        (isMarkdownTableSeparator(tableLines[1]) || tableLines.every((tl) => tl.trim().endsWith('|')))
      ) {
        const hasSep = isMarkdownTableSeparator(tableLines[1]);
        const headerCells = splitMarkdownTableRow(tableLines[0]);
        const bodyRows = (hasSep ? tableLines.slice(2) : tableLines.slice(1))
          .filter((r) => !isMarkdownTableSeparator(r))
          .map(splitMarkdownTableRow);

        const colCount = Math.max(headerCells.length, ...bodyRows.map((r) => r.length));

        blocks.push(
          <div
            key={`b-${blockKey++}`}
            className="w-full overflow-x-auto my-2 rounded-xl bg-white/75 shadow-[0_4px_14px_-3px_rgba(0,0,0,0.10)]"
          >
            <table className={`w-full text-right border-collapse ${sizeConfig.table}`}>
              <thead>
                <tr className="bg-black/[0.07]">
                  {Array.from({ length: colCount }, (_, cIdx) => (
                    <th
                      key={cIdx}
                      className="px-3 py-2 font-extrabold text-black text-right align-middle"
                    >
                      {renderInlineMarkdown(headerCells[cIdx] ?? '', `th-${blockKey}-${cIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="even:bg-black/[0.03]"
                  >
                    {Array.from({ length: colCount }, (_, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 font-normal text-neutral-900 text-right align-top leading-relaxed"
                      >
                        {renderInlineMarkdown(row[cIdx] ?? '', `td-${blockKey}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j;
        continue;
      }
    }

    // 5. Blockquote (> ...)
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`b-${blockKey++}`}
          className={`w-full bg-black/[0.06] rounded-xl px-3.5 py-2 my-1 text-neutral-900/90 ${sizeConfig.body} font-normal`}
        >
          {quoteLines.map((ql, idx) => (
            <div key={idx}>{renderInlineMarkdown(ql, `q-${blockKey}-${idx}`)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // 6. Unordered List (- , * , + , • )
    if (/^\s*([-*+•])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+•])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+•])\s+/, '').trim());
        i++;
      }
      blocks.push(
        <ul
          key={`b-${blockKey++}`}
          className={`w-full list-disc pr-5 space-y-1 my-1 text-right ${sizeConfig.body} ${
            useAllBold ? 'font-bold' : 'font-normal'
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item, `ul-${blockKey}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered List (1. , 2. , ...)
    const olStartMatch = line.match(/^\s*(\d+)[.)]\s+/);
    if (olStartMatch) {
      const startNum = Number(olStartMatch[1]) || 1;
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '').trim());
        i++;
      }
      blocks.push(
        <ol
          key={`b-${blockKey++}`}
          start={startNum}
          className={`w-full list-decimal pr-5 space-y-1 my-1 text-right ${sizeConfig.body} ${
            useAllBold ? 'font-bold' : 'font-normal'
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item, `ol-${blockKey}-${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Paragraph (collect consecutive plain lines until blank line or next structural block)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      const curTrim = cur.trim();
      if (
        !curTrim ||
        curTrim.startsWith('```') ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(curTrim) ||
        /^\s*(#{1,6})\s+/.test(cur) ||
        (curTrim.startsWith('|') && curTrim.includes('|', 1)) ||
        /^\s*>\s?/.test(cur) ||
        /^\s*([-*+•])\s+/.test(cur) ||
        /^\s*\d+[.)]\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i++;
    }

    blocks.push(
      <div
        key={`b-${blockKey++}`}
        className={`w-full text-right text-neutral-950 whitespace-pre-wrap break-words ${sizeConfig.body} ${
          useAllBold ? 'font-bold' : 'font-normal'
        }`}
      >
        {paraLines.map((pl, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInlineMarkdown(pl, `p-${blockKey}-${idx}`)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return <div className="w-full space-y-2 text-right" dir="rtl">{blocks}</div>;
};
