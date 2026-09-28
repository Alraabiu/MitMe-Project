import {
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Floating picture-in-picture view of your own camera.
 * Always visible while your camera is on — matches Google Meet behavior.
 */
export function SelfView() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  // Narrow the type: only real track references (not placeholders)
  const local = tracks.find(
    (t): t is TrackReference =>
      isTrackReference(t) && !!t.participant?.isLocal
  );

  if (!local) return null;

  return (
    <div className="self-view" aria-label="Your camera">
      <VideoTrack trackRef={local} />
    </div>
  );
}