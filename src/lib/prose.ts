import { cn } from '@/lib/utils';

// Moved verbatim from ProjectModal's `markdownClasses` so the modal renders exactly as before.
const COMFORTABLE = cn(
  'text-[0.9375rem] leading-relaxed text-muted-foreground',
  '[&>*+*]:mt-4',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground',
  '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-primary/60',
  '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground',
  '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
);

// Chat answers: link styles live in ChatLink, and headings are rendered as paragraphs.
const COMPACT =
  'text-sm leading-relaxed text-foreground break-words [&>*+*]:mt-2.5 [&_strong]:font-semibold [&_em]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-primary/60 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:border-border';

/** Shared markdown typography: `comfortable` for long-form project write-ups, `compact` for chat answers. */
export function proseClasses(size: 'comfortable' | 'compact'): string {
  return size === 'compact' ? COMPACT : COMFORTABLE;
}
