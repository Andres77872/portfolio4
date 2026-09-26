/**
 * useTerminalSound.ts — opt-in retro sound effects, OFF by default.
 *
 * A tiny WebAudio synth (no assets). The AudioContext is created lazily on the
 * first enable/gesture to respect browser autoplay policy, and the preference is
 * persisted in localStorage (mirroring the useCrtIntensity storage pattern).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'matrix-rpg:sound';

export interface TerminalSound {
  enabled: boolean;
  toggle: () => void;
  playKey: () => void;
  playBell: () => void;
  playError: () => void;
}

const hasWindow = () => typeof window !== 'undefined';

// localStorage throws in some privacy modes; sound then defaults to off.
const readStored = (): boolean => {
  if (!hasWindow()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

const store = (enabled: boolean) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage unavailable: the choice lasts for this session only.
  }
};

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (!hasWindow()) return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  );
};

export function useTerminalSound(): TerminalSound {
  const [enabled, setEnabled] = useState<boolean>(readStored);
  const enabledRef = useRef(enabled);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (contextRef.current) {
      if (contextRef.current.state === 'suspended') void contextRef.current.resume();
      return contextRef.current;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      contextRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const blip = useCallback(
    (freq: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
      if (!enabledRef.current) return;
      const ctx = ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    [ensureContext],
  );

  const playKey = useCallback(() => blip(200, 0.03, 0.015, 'square'), [blip]);
  const playBell = useCallback(() => {
    blip(880, 0.18, 0.05, 'sine');
    blip(1320, 0.14, 0.03, 'sine');
  }, [blip]);
  const playError = useCallback(() => blip(110, 0.28, 0.06, 'sawtooth'), [blip]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      store(next);
      if (next) ensureContext(); // create within the click gesture so audio is allowed
      return next;
    });
  }, [ensureContext]);

  useEffect(
    () => () => {
      void contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
    },
    [],
  );

  return { enabled, toggle, playKey, playBell, playError };
}
