import { useEffect, useRef } from 'react';
import { MicOff, Hand, MonitorUp } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import type { User } from '../../types';

interface ParticipantTileProps {
  user: User;
  stream?: MediaStream | null;
  muted: boolean;
  camera: boolean;
  hand: boolean;
  share: boolean;
  isSelf: boolean;
}

export function ParticipantTile({
  user,
  stream,
  muted,
  camera,
  hand,
  share,
  isSelf,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="tile">
      {camera && stream ? (
        <video ref={videoRef} autoPlay muted={isSelf} playsInline />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block' }}>
            <Avatar name={user.displayName} src={user.avatarUrl} size={72} />
          </div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>
            {user.displayName}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#aaa' }}>
            {isSelf ? 'You' : 'Waiting for video?'}
          </div>
        </div>
      )}

      <div className="tile-badges">
        {muted && (
          <span className="tile-badge" title="Muted">
            <MicOff size={12} />
          </span>
        )}
        {hand && (
          <span
            className="tile-badge"
            style={{ background: '#f0a04b' }}
            title="Hand raised"
          >
            <Hand size={12} />
          </span>
        )}
        {share && (
          <span
            className="tile-badge"
            style={{ background: '#3264e8' }}
            title="Sharing screen"
          >
            <MonitorUp size={12} />
          </span>
        )}
      </div>

      <span className="label">{user.displayName}</span>
    </div>
  );
}
