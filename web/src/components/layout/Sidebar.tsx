import {
  Bell,
  BellOff,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import type { User } from '../../types';

export type NavId =
  | 'home'
  | 'messages'
  | 'meetings'
  | 'contacts'
  | 'settings'
  | 'admin';

interface SidebarProps {
  user: User;
  page: NavId;
  onNavigate: (id: NavId) => void;
  onLogout: () => void;
  unreadMessages?: number;
  muted?: boolean;
  onToggleMuted?: () => void;
}

const NAV: { id: NavId; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'home', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'messages', label: 'Messages', Icon: MessageCircle },
  { id: 'meetings', label: 'Meetings', Icon: CalendarDays },
  { id: 'contacts', label: 'Contacts', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export function Sidebar({
  user,
  page,
  onNavigate,
  onLogout,
  unreadMessages = 0,
  muted = false,
  onToggleMuted,
}: SidebarProps) {
  return (
    <aside className="sidebar">
     <Logo variant="mark" />

      <nav className="nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={page === id ? 'active' : ''}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
            {id === 'messages' && unreadMessages > 0 && (
              <span className="unread-badge" aria-label={`${unreadMessages} unread messages`}>
                {unreadMessages}
              </span>
            )}
          </button>
        ))}

        {user.role === 'admin' && (
          <button
            className={page === 'admin' ? 'active' : ''}
            onClick={() => onNavigate('admin')}
          >
            <Shield size={19} />
            <span>Admin</span>
          </button>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        {onToggleMuted && (
          <button
            className="nav"
            style={{ background: 'transparent', border: 0, color: '#cfc9dd' }}
            onClick={onToggleMuted}
            aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
            title={muted ? 'Unmute notifications' : 'Mute notifications'}
          >
            {muted ? <BellOff size={18} /> : <Bell size={18} />}
            <span>{muted ? 'Unmute notifications' : 'Mute notifications'}</span>
          </button>
        )}
        <button
          className="nav"
          style={{ background: 'transparent', border: 0, color: '#cfc9dd' }}
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
