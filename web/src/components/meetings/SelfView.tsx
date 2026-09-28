import {
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Floating picture-in-picture view of your own camera.
 * Visible ONLY while you are sharing your screen — so you can see
 * yourself alongside the shared content, matching Google Meet.
 */
export function SelfView() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Are we (the local user) currently sharing our screen?
  const isSharingScreen = tracks.some(
    (t) => t.participant?.isLocal && t.source === Track.Source.ScreenShare
  );

  // Are we publishing our own camera?
  const localCamera = tracks.find(
    (t): t is TrackReference =>
      isTrackReference(t) &&
      !!t.participant?.isLocal &&
      t.source === Track.Source.Camera
  );

  // Only render during screen share, and only if camera is on
  if (!isSharingScreen || !localCamera) return null;

  return (
    <div className="self-view" aria-label="Your camera">
      <VideoTrack trackRef={localCamera} />
    </div>
  );
}