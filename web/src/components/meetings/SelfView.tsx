import {
  useTracks,
  VideoTrack,
  isTrackReference,
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

  const local = tracks.find(
    (t) => t.participant?.isLocal && isTrackReference(t)
  );

  if (!local) return null;

  return (
    <div className="self-view" aria-label="Your camera">
      <VideoTrack trackRef={local} />
    </div>
  );
}