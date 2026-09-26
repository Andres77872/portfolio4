import { memo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

import ChatLink from './ChatLink';

const Heading = ({ children }: { children?: ReactNode }) => <p className="font-semibold text-foreground">{children}</p>;

// Module scope keeps the map stable, so react-markdown never remounts rendered nodes.
const components: Components = {
  a: ({ href, children }) => <ChatLink href={href}>{children}</ChatLink>,
  // Model output never loads an image: only its alt text is shown.
  img: ({ alt }) => (alt ? <span className="italic text-muted-foreground">[{alt}]</span> : null),
  // The page already has an h1 and the panel an h2; answer headings must not enter the outline.
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
  pre: ({ children }) => (
    <pre tabIndex={0} role="group" aria-label="Code" className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">
      {children}
    </pre>
  ),
};

/** Assistant markdown with the chat's link policy; no plugins, no raw HTML, no images. */
function ChatMarkdown({ content }: { content: string }) {
  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}

export default memo(ChatMarkdown);
