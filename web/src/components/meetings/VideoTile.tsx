import { useEffect, useRef } from 'react';
import type { User } from '../../types';

interface VideoTileProps {
  user: User;
  stream?: MediaStream | null;
  muted?: boolean;
  camera?: boolean;
  isSelf?: boolean;
}

export function VideoTile({
  user,
  stream,
  muted = true,
  camera = false,
  isSelf = false,
}: VideoTileProps) {
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
          <div className="avatar" style={{ margin: 'auto', width: 64, height: 64, fontSize: 26 }}>
            {user.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ marginTop: 8 }}>{user.displayName}</div>
        </div>
      )}
      <span className="label">{muted ? 'Muted' : 'Live'}</span>
    </div>
  );
}