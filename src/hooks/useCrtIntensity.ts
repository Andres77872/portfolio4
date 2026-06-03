import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrtIntensity, UserSelectableCrtIntensity } from '@/games/matrix-rpg/types';

const STORAGE_KEY = 'matrix-rpg:crt-intensity';
const USER_VALUES: UserSelectableCrtIntensity[] = [1, 2, 3];

type OverrideReason = 'reduced-motion' | 'forced-colors' | 'reduced-transparency' | 'contrast-more' | null;

export interface CrtPreferenceState {
  preferredIntensity: UserSelectableCrtIntensity;
  effectiveIntensity: CrtIntensity;
  isOverriddenByOs: boolean;
  overrideReason: OverrideReason;
  setIntensity: (value: UserSelectableCrtIntensity) => void;
  cycleIntensity: () => void;
}

interface MediaSnapshot {
  reducedMotion: boolean;
  forcedColors: boolean;
  reducedTransparency: boolean;
  contrastMore: boolean;
}

const hasWindow = () => typeof window !== 'undefined';

const isUserIntensity = (value: unknown): value is UserSelectableCrtIntensity =>
  value === 1 || value === 2 || value === 3;

const readStoredIntensity = (): UserSelectableCrtIntensity => {
  if (!hasWindow()) return 1;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return isUserIntensity(parsed) ? parsed : 1;
};

const getMediaSnapshot = (): MediaSnapshot => {
  if (!hasWindow() || typeof window.matchMedia !== 'function') {
    return {
      reducedMotion: false,
      forcedColors: false,
      reducedTransparency: false,
      contrastMore: false,
    };
  }

  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    forcedColors: window.matchMedia('(forced-colors: active)').matches,
    reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
    contrastMore: window.matchMedia('(prefers-contrast: more)').matches,
  };
};

const getOverrideReason = (snapshot: MediaSnapshot): OverrideReason => {
  if (snapshot.forcedColors) return 'forced-colors';
  if (snapshot.reducedMotion) return 'reduced-motion';
  if (snapshot.reducedTransparency) return 'reduced-transparency';
  if (snapshot.contrastMore) return 'contrast-more';
  return null;
};

const getEffectiveIntensity = (
  preferredIntensity: UserSelectableCrtIntensity,
  snapshot: MediaSnapshot
): CrtIntensity => {
  const reason = getOverrideReason(snapshot);
  if (reason === 'forced-colors' || reason === 'reduced-motion' || reason === 'reduced-transparency') {
    return 0;
  }
  if (reason === 'contrast-more') return Math.min(preferredIntensity, 1) as CrtIntensity;
  return preferredIntensity;
};

export function useCrtIntensity(): CrtPreferenceState {
  const [preferredIntensity, setPreferredIntensity] = useState<UserSelectableCrtIntensity>(readStoredIntensity);
  const [mediaSnapshot, setMediaSnapshot] = useState<MediaSnapshot>(getMediaSnapshot);

  const overrideReason = useMemo(() => getOverrideReason(mediaSnapshot), [mediaSnapshot]);
  const effectiveIntensity = useMemo(
    () => getEffectiveIntensity(preferredIntensity, mediaSnapshot),
    [preferredIntensity, mediaSnapshot]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.crtIntensity = String(effectiveIntensity);
    document.documentElement.dataset.crtOverride = overrideReason ?? 'none';

    return () => {
      delete document.documentElement.dataset.crtIntensity;
      delete document.documentElement.dataset.crtOverride;
    };
  }, [effectiveIntensity, overrideReason]);

  useEffect(() => {
    if (!hasWindow() || typeof window.matchMedia !== 'function') return;

    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(forced-colors: active)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(prefers-contrast: more)'),
    ];

    const handleChange = () => setMediaSnapshot(getMediaSnapshot());
    queries.forEach(query => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handleChange);
      } else {
        query.addListener(handleChange);
      }
    });

    return () => {
      queries.forEach(query => {
        if (typeof query.removeEventListener === 'function') {
          query.removeEventListener('change', handleChange);
        } else {
          query.removeListener(handleChange);
        }
      });
    };
  }, []);

  const setIntensity = useCallback((value: UserSelectableCrtIntensity) => {
    if (!isUserIntensity(value)) return;
    setPreferredIntensity(value);
    if (hasWindow()) {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    }
  }, []);

  const cycleIntensity = useCallback(() => {
    setPreferredIntensity(current => {
      const next = USER_VALUES[(USER_VALUES.indexOf(current) + 1) % USER_VALUES.length];
      if (hasWindow()) {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return {
    preferredIntensity,
    effectiveIntensity,
    isOverriddenByOs: effectiveIntensity !== preferredIntensity,
    overrideReason,
    setIntensity,
    cycleIntensity,
  };
}
