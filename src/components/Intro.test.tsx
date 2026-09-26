import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { askMock, availableMock } = vi.hoisted(() => ({
  askMock: vi.fn(),
  availableMock: vi.fn(() => true),
}));

vi.mock('@/lib/assistant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/assistant')>()),
  askAssistant: askMock,
  isAssistantAvailable: availableMock,
}));

import Intro from './Intro';

describe('Intro', () => {
  afterEach(() => {
    askMock.mockReset();
    availableMock.mockReset();
  });

  it('offers "Ask the assistant" after the other calls to action when the assistant is available', () => {
    availableMock.mockReturnValue(true);
    render(<Intro />);

    const cta = screen.getByRole('button', { name: 'Ask the assistant' });
    const about = screen.getByRole('link', { name: 'About me' });
    expect(about.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(cta);

    expect(askMock).toHaveBeenCalledTimes(1);
    expect(askMock).toHaveBeenCalledWith();
  });

  it('has no assistant call to action when the assistant is unavailable', () => {
    availableMock.mockReturnValue(false);
    render(<Intro />);

    expect(screen.queryByRole('button', { name: 'Ask the assistant' })).toBeNull();
    expect(screen.getByRole('link', { name: /Browse the work/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About me' })).toBeInTheDocument();
  });
});
