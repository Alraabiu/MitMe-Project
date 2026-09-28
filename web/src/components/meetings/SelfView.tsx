import { useEffect } from 'react';
import {
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Floating picture-in-picture view of your OWN camera.
 *
 * Appears when ANY participant is sharing their screen (so you can
 * still see yourself alongside the shared content). Hidden otherwise.
 *
 * While the PiP is visible, your big tile in the grid is hidden via
 * CSS (see `.screen-sharing-active .lk-participant-tile[data-lk-local-participant="true"]`),
 * so you never see your own face twice.
 */
export function SelfView() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Is any screen share active in the meeting right now?
  const isAnyScreenShareActive = tracks.some(
    (t) => t.source === Track.Source.ScreenShare
  );

  // Your own camera track (only if you have it enabled)
  const localCamera = tracks.find(
    (t): t is TrackReference =>
      isTrackReference(t) &&
      !!t.participant?.isLocal &&
      t.source === Track.Source.Camera
  );

  // Toggle a class on the meeting wrapper so CSS can hide our own tile
  useEffect(() => {
    const wrapper = document.querySelector('.meeting-livekit');
    if (!wrapper) return;

    if (isAnyScreenShareActive && localCamera) {
      wrapper.classList.add('screen-sharing-active');
    } else {
      wrapper.classList.remove('screen-sharing-active');
    }

    return () => {
      wrapper.classList.remove('screen-sharing-active');
    };
  }, [isAnyScreenShareActive, localCamera]);

  // Only render the PiP when someone is sharing AND your camera is on
  if (!isAnyScreenShareActive || !localCamera) return null;

  return (
    <div className="self-view" aria-label="Your camera">
      <VideoTrack trackRef={localCamera} />
      <span className="self-view-label">You</span>
    </div>
  );
}