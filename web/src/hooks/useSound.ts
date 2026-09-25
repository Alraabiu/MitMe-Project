import { useCallback, useRef } from 'react';

type SoundName = 'message' | 'sent' | 'join' | 'leave';

/**
 * Plays short synthesized chimes using the Web Audio API.
 * No audio files needed — works offline, never 404s.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    // Resume on demand (browsers suspend until user interacts)
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

      // Gentle attack + decay envelope
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
    (name: SoundName) => {
      try {
        const ctx = getCtx();

        switch (name) {
          case 'message':
            // Two-note ascending chime (ding-dong)
            playNote(ctx, 880, 0, 0.12);
            playNote(ctx, 1174.66, 0.09, 0.22);
            break;

          case 'sent':
            // Single short tick (lower)
            playNote(ctx, 660, 0, 0.08, 0.08);
            break;

          case 'join':
            // Three-note ascending
            playNote(ctx, 523.25, 0, 0.1);
            playNote(ctx, 659.25, 0.08, 0.1);
            playNote(ctx, 783.99, 0.16, 0.2);
            break;

          case 'leave':
            // Two-note descending
            playNote(ctx, 783.99, 0, 0.1);
            playNote(ctx, 523.25, 0.1, 0.2);
            break;
        }
      } catch {
        /* audio unavailable — fail silently */
      }
    },
    [getCtx, playNote]
  );

  /**
   * Call this once after any user interaction to unlock audio
   * on browsers that block autoplay.
   */
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