/**
 * Flattens assistant markdown for screen reader announcements: keeps link and image text,
 * drops emphasis, code ticks, headings, quotes and list markers, and collapses whitespace.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^\s*(`{3,}|~{3,}).*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_]([^*_\s][^*_]*?)[*_](?=[^\w*]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuts `text` to at most `max` characters, preferring the last word boundary. */
export function truncateOnWord(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };

  const cut = text.slice(0, max);
  const endsOnBoundary = /\s/.test(text.charAt(max));
  const lastSpace = cut.search(/\s\S*$/);
  const result = endsOnBoundary || lastSpace <= 0 ? cut : cut.slice(0, lastSpace);

  return { text: result.replace(/[\s,;:]+$/, ''), truncated: true };
}
