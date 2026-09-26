// Real ReadableStreams for chat tests: no network, no hand-rolled reader fakes.

const encoder = new TextEncoder();

export interface ControlledStream {
  stream: ReadableStream<Uint8Array>;
  push(text: string): void;
  close(): void;
  error(reason: unknown): void;
  /** True once the consumer cancelled the stream (reader.cancel()). */
  readonly cancelled: boolean;
}

/** A stream the test drives chunk by chunk. Pushes after close, error or cancel are ignored. */
export function createControlledStream(): ControlledStream {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let open = true;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
    cancel() {
      open = false;
      cancelled = true;
    },
  });

  return {
    stream,
    push(text) {
      if (open) controller.enqueue(encoder.encode(text));
    },
    close() {
      if (!open) return;
      open = false;
      controller.close();
    },
    error(reason) {
      if (!open) return;
      open = false;
      controller.error(reason);
    },
    get cancelled() {
      return cancelled;
    },
  };
}

/** Enqueues every chunk and closes inside `start`, so the whole body is already buffered. */
export function bufferedStream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

export interface SseResponseOptions {
  /** Byte offsets where the encoded body is split into separate network chunks. */
  split?: number[];
  /** Append "\n" after the last line too (default true). */
  trailingNewline?: boolean;
  /** Leave the body open after the last chunk, like a server that never closes. */
  keepOpen?: boolean;
  /** Called when the consumer cancels the upstream body. */
  onCancel?: () => void;
  status?: number;
}

/** A 200 `Response` whose body carries `lines` as SSE, optionally split at byte offsets. */
export function sseResponse(lines: string[], options: SseResponseOptions = {}): Response {
  const { split = [], trailingNewline = true, keepOpen = false, onCancel, status = 200 } = options;
  const bytes = encoder.encode(lines.join('\n') + (trailingNewline ? '\n' : ''));
  const offsets = [0, ...split.filter((offset) => offset > 0 && offset < bytes.length).sort((a, b) => a - b), bytes.length];

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < offsets.length - 1; index += 1) {
        controller.enqueue(bytes.slice(offsets[index], offsets[index + 1]));
      }
      if (!keepOpen) controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });

  return new Response(body, { status });
}

/** Reads a stream to the end and decodes it as UTF-8. */
export async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
