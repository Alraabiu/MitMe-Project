import {
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Floating picture-in-picture view of your own camera.
 *
 * Visible whenever ANY participant is sharing their screen (host or not),
 * as long as your own camera is on. This matches Google Meet behavior:
 * every participant sees themselves + the shared content.
 *
 * Hidden when the screen share stops.
 */
export function SelfView() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Is a screen share active anywhere in the meeting?
  // (host sharing OR you sharing — either counts)
  const isAnyScreenShareActive = tracks.some(
    (t) => t.source === Track.Source.ScreenShare
  );

  // Your own camera track (only if you have it on)
  const localCamera = tracks.find(
    (t): t is TrackReference =>
      isTrackReference(t) &&
      !!t.participant?.isLocal &&
      t.source === Track.Source.Camera
  );

  // Show the PiP only when:
  //   1. Someone is sharing a screen, AND
  //   2. Your camera is on
  if (!isAnyScreenShareActive || !localCamera) return null;

  return (
    <div className="self-view" aria-label="Your camera">
      <VideoTrack trackRef={localCamera} />
    </div>
  );
}