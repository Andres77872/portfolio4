// Button's base `outline-none` sets --tw-outline-style:none in Tailwind 4.3, so `outline-solid` is required.
// `outline-none` base: `outline-hidden` would paint a permanent 2px box on every control in forced-colors
// mode. The focus-visible outline is a real outline, which forced colors keeps.
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:ring-0';

export const monoLabel = 'font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground';

/** Panel header bar, shared by the loaded header, the loading skeleton and the load-error fallback. */
export const panelHeader =
  'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 group-data-[layout=sheet]/panel:h-[calc(3.5rem+env(safe-area-inset-top))] group-data-[layout=sheet]/panel:pt-[env(safe-area-inset-top)]';

/** Square icon buttons in the panel header (32 px, 44 px on coarse pointers). */
export const headerIconButton = 'size-8 pointer-coarse:size-11 text-muted-foreground hover:text-foreground';

/** Small text buttons inside the panel (notices, confirmation, cards). */
export const panelTextButton = 'h-8 pointer-coarse:h-11';

/** Suggestion chips (welcome and the context bar). */
export const suggestionChip =
  'inline-flex min-h-9 items-center rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-left text-[0.8125rem] leading-snug text-foreground hover:border-primary/35 pointer-coarse:min-h-11 contrast-more:border-foreground/60';
