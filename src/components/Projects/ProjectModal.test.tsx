import { StrictMode, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { askMock, availableMock } = vi.hoisted(() => ({
  askMock: vi.fn(),
  availableMock: vi.fn(() => true),
}));

vi.mock('@/lib/assistant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/assistant')>()),
  askAssistant: askMock,
  isAssistantAvailable: availableMock,
}));

import { proseClasses } from '@/lib/prose';
import { stubClientRects } from '@/test/dom';

import { catalog, findProjectBySlug } from './catalog';
import ProjectModal from './ProjectModal';
import type { CatalogProject } from './types';

const project = findProjectBySlug(catalog, 'findit')!;

// ProjectModal's `markdownClasses` before it moved to proseClasses('comfortable').
const PREVIOUS_MARKDOWN_CLASSES = [
  'text-[0.9375rem] leading-relaxed text-muted-foreground',
  '[&>*+*]:mt-4',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground',
  '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-primary/60',
  '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground',
  '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
].join(' ');

interface HarnessProps {
  subject?: CatalogProject;
  showOpener?: boolean;
  onClose?: () => void;
  onTechnologyClick?: (technology: string) => void;
}

/** A stub Work section plus an opener button; the modal renders conditionally, as in Projects.tsx. */
function Harness({
  subject = project,
  showOpener = true,
  onClose = () => undefined,
  onTechnologyClick = () => undefined,
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose();
    setOpen(false);
  };
  const showUsing = (technology: string) => {
    onTechnologyClick(technology);
    setOpen(false);
  };

  return (
    <>
      <main>
        <section id="projects">
          <h2 id="projects-heading">Work</h2>
        </section>
        {showOpener && (
          <button type="button" onClick={() => setOpen(true)}>
            Open FindIT
          </button>
        )}
      </main>
      {open && (
        <ProjectModal
          project={subject}
          previous={null}
          next={null}
          position={{ index: 0, total: 1 }}
          onClose={close}
          onNavigate={() => undefined}
          selectedTechnologies={[]}
          onTechnologyClick={showUsing}
        />
      )}
    </>
  );
}

async function openFromButton() {
  const opener = screen.getByRole('button', { name: 'Open FindIT' });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog', { name: 'FindIT' });
  await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  return { opener, dialog };
}

const pressEscape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

describe('ProjectModal', () => {
  let restoreRects: () => void;

  beforeEach(() => {
    availableMock.mockReturnValue(true);
    restoreRects = stubClientRects();
  });

  afterEach(() => {
    restoreRects();
    askMock.mockReset();
    availableMock.mockReset();
  });

  it('opens with focus on the scrolling body, not its first button', async () => {
    render(<Harness />);
    const { dialog } = await openFromButton();
    const active = document.activeElement as HTMLElement;

    expect(dialog).toContainElement(active);
    expect(active).not.toBe(dialog);
    expect(active.tagName).toBe('DIV');
    expect(active).toHaveAttribute('tabindex', '-1');
    expect(active.className).toContain('overflow-y-auto');
  });

  it('returns focus to the element that opened it, not <body>', async () => {
    render(<Harness />);
    const { opener } = await openFromButton();

    pressEscape();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('moves focus to the Work heading when the opener is gone', async () => {
    const { rerender } = render(<Harness />);
    await openFromButton();

    rerender(<Harness showOpener={false} />);
    pressEscape();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('projects-heading')));
    expect(document.getElementById('projects-heading')).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus to the Work heading when it was opened from nowhere (a deep link)', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open FindIT' }));
    await screen.findByRole('dialog', { name: 'FindIT' });

    pressEscape();

    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('projects-heading')));
  });

  it('hands off to the assistant after closing, without refocusing the opener', async () => {
    const onClose = vi.fn();
    const atAsk = { dialogOpen: true, pageHidden: true };
    askMock.mockImplementation(() => {
      atAsk.dialogOpen = document.querySelector('[data-slot="dialog-content"]') !== null;
      atAsk.pageHidden = document.querySelector('main')?.getAttribute('aria-hidden') === 'true';
    });
    render(<Harness onClose={onClose} />);
    const { opener, dialog } = await openFromButton();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ask about this project' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(askMock).toHaveBeenCalledWith({ projectSlug: 'findit' }));
    expect(askMock).toHaveBeenCalledTimes(1);
    // Radix calls it once the modal is gone and its aria-hidden/pointer lock are undone.
    expect(atAsk).toEqual({ dialogOpen: false, pageHidden: false });
    expect(document.activeElement).not.toBe(opener);
  });

  it('has no Ask button when the assistant is unavailable', async () => {
    availableMock.mockReturnValue(false);
    render(<Harness />);
    const { dialog } = await openFromButton();

    expect(within(dialog).queryByRole('button', { name: 'Ask about this project' })).toBeNull();
    // The project links still render in the header row.
    expect(within(dialog).getByRole('link', { name: /Live demo: FindIT/ })).toBeInTheDocument();
  });

  it('puts the Ask button next to the project links', async () => {
    render(<Harness />);
    const { dialog } = await openFromButton();

    const ask = within(dialog).getByRole('button', { name: 'Ask about this project' });
    const row = ask.parentElement as HTMLElement;
    expect(row).toHaveClass('mt-5', 'flex', 'flex-wrap', 'items-center', 'gap-2');
    expect(within(row).getByRole('link', { name: /Live demo: FindIT/ })).toBeInTheDocument();
    expect(row.querySelector('.mt-5 .mt-5')).toBeNull();
  });

  it('adds no header spacing for a project with no links while the assistant is off', async () => {
    availableMock.mockReturnValue(false);
    render(<Harness subject={{ ...project, url: undefined, repoUrl: undefined, apiUrl: undefined }} />);
    const { dialog } = await openFromButton();

    // The row renders empty and `empty:hidden` removes it, as the old `ProjectLinks className="mt-5"` did.
    const row = dialog.querySelector('header .mt-5.flex') as HTMLElement;
    expect(row).toBeEmptyDOMElement();
    expect(row).toHaveClass('empty:hidden');
  });

  it('moves focus to the Work heading after "see every project that uses it"', async () => {
    const onTechnologyClick = vi.fn();
    render(<Harness onTechnologyClick={onTechnologyClick} />);
    const { opener, dialog } = await openFromButton();

    fireEvent.click(within(dialog).getByRole('button', { name: 'QDRANT' }));

    expect(onTechnologyClick).toHaveBeenCalledWith('QDRANT');
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('projects-heading')));
    expect(document.activeElement).not.toBe(opener);
    expect(askMock).not.toHaveBeenCalled();
  });

  it('keeps focus inside under StrictMode and still restores it on close', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    const opener = screen.getByRole('button', { name: 'Open FindIT' });
    const openerFocus = vi.fn();
    opener.addEventListener('focus', openerFocus);
    const { dialog } = await openFromButton();
    openerFocus.mockClear();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(openerFocus).not.toHaveBeenCalled();

    pressEscape();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('renders the write-up with the unchanged long-form typography', async () => {
    render(<Harness />);
    const { dialog } = await openFromButton();

    expect(proseClasses('comfortable')).toBe(PREVIOUS_MARKDOWN_CLASSES);
    const prose = Array.from(dialog.querySelectorAll('div')).find((element) => element.className === PREVIOUS_MARKDOWN_CLASSES);
    expect(prose).toBeDefined();
    expect(prose?.textContent?.length).toBeGreaterThan(0);
  });
});
