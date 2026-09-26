import { useMediaQuery } from '@/hooks/useMediaQuery';

import { COARSE_POINTER_QUERY, EXPAND_QUERY, SHEET_QUERY, SHORT_QUERY } from '../constants';

export type PanelLayout = 'floating' | 'sheet';

export interface PanelLayoutState {
  layout: PanelLayout;
  /** Sheet on a very short viewport (phone landscape, 400% zoom): the whole sheet scrolls. */
  short: boolean;
  coarse: boolean;
  /** "Larger panel" is offered only for the floating panel on wide, fine-pointer screens. */
  canExpand: boolean;
}

/**
 * The single source of the panel layout. CSS keys off `data-layout`/`data-short`, so a
 * layout switch (for example rotating a phone) re-renders but never remounts anything.
 */
export function usePanelLayout(): PanelLayoutState {
  const sheet = useMediaQuery(SHEET_QUERY);
  const short = useMediaQuery(SHORT_QUERY);
  const coarse = useMediaQuery(COARSE_POINTER_QUERY);
  const expand = useMediaQuery(EXPAND_QUERY);

  return {
    layout: sheet ? 'sheet' : 'floating',
    short: sheet && short,
    coarse,
    canExpand: !sheet && expand,
  };
}

export default usePanelLayout;
