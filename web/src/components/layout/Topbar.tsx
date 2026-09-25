import { Avatar } from '../common/Avatar';
import type { User } from '../../types';

interface TopbarProps {
  title: string;
  user: User;
}

export function Topbar({ title, user }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="muted">Connect. Meet. Share.</div>
      </div>
      <Avatar name={user.displayName} src={user.avatarUrl} />
    </div>
  );
}