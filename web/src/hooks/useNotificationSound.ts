import { useCallback, useRef } from 'react';

type SoundType = 'request' | 'message' | 'join' | 'leave';

/**
 * Plays short synthesized chimes using the Web Audio API.
 * No audio files needed — works offline, never 404s.
 */
export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const playNote = useCallback(
    (
      ctx: AudioContext,
      freq: number,
      start: number,
      duration: number,
      volume = 0.12
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    },
    []
  );

  const play = useCallback(
    (type: SoundType = 'request') => {
      try {
        const ctx = getCtx();

        switch (type) {
          case 'request':
            // Three-note ascending "ding-ding-dong" — notice me!
            playNote(ctx, 880, 0, 0.15);
            playNote(ctx, 1174.66, 0.14, 0.15);
            playNote(ctx, 1567.98, 0.28, 0.3);
            break;

          case 'message':
            // Two-note ding-dong
            playNote(ctx, 880, 0, 0.12);
            playNote(ctx, 1174.66, 0.09, 0.22);
            break;

          case 'join':
            // Warm ascending triad
            playNote(ctx, 523.25, 0, 0.1);
            playNote(ctx, 659.25, 0.08, 0.1);
            playNote(ctx, 783.99, 0.16, 0.2);
            break;

          case 'leave':
            // Descending two-note
            playNote(ctx, 783.99, 0, 0.1);
            playNote(ctx, 523.25, 0.1, 0.2);
            break;
        }
      } catch {
        /* audio unavailable */
      }
    },
    [getCtx, playNote]
  );

  /** Call once after any user gesture to unlock audio on strict browsers. */
  const unlock = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch {
      /* ignore */
    }
  }, [getCtx]);

  return { play, unlock };
}