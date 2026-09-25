// @ts-nocheck

import {
  Camera,
  CameraOff,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  PenTool,
  Smile,
} from 'lucide-react';

interface MeetingControlsProps {
  muted: boolean;
  camera: boolean;
  share: boolean;
  hand: boolean;
  whiteboardOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onToggleHand: () => void;
  onToggleWhiteboard: () => void;
  onLeave: () => void;
}

export function MeetingControls({
  muted,
  camera,
  share,
  hand,
  whiteboardOpen,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onToggleHand,
  onToggleWhiteboard,
  onLeave,
}: MeetingControlsProps) {
  return (
    <div className="controls">
      <button
        className={`control ${muted ? '' : 'active'}`}
        onClick={onToggleMic}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <MicOff /> : <Mic />}
      </button>

      <button
        className={`control ${camera ? 'active' : ''}`}
        onClick={onToggleCamera}
        aria-label={camera ? 'Turn camera off' : 'Turn camera on'}
      >
        {camera ? <Camera /> : <CameraOff />}
      </button>

      <button
        className={`control ${share ? 'active' : ''}`}
        onClick={onToggleShare}
        aria-label="Share screen"
      >
        <MonitorUp />
      </button>

      <button
        className={`control ${hand ? 'active' : ''}`}
        onClick={onToggleHand}
        aria-label="Raise hand"
      >
        <Hand />
      </button>

      <button
        className={`control ${whiteboardOpen ? 'active' : ''}`}
        onClick={onToggleWhiteboard}
        aria-label="Toggle whiteboard"
      >
        <PenTool />
      </button>

      <button className="control" aria-label="Reactions">
        <Smile />
      </button>

      <button className="control end" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}