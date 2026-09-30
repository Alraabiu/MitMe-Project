import {
  Bell,
  BellOff,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { Avatar } from '../common/Avatar';
import type { User } from '../../types';

export type NavId =
  | 'home'
  | 'messages'
  | 'classes'
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
  isOnline?: boolean;
}

const NAV: {
  id: NavId;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: 'home', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'messages', label: 'Messages', Icon: MessageCircle },
  { id: 'classes', label: 'Classes', Icon: GraduationCap },
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
  isOnline = true,
}: SidebarProps) {
  const isAdmin = String(user.role || '').toLowerCase() === 'admin';

  return (
    <aside className="sidebar">
      <Logo variant="mark" />

      {/* User card with live status */}
      <div className="sidebar-user-card">
        <div className="sidebar-user-row">
          <Avatar name={user.displayName} src={user.avatarUrl} size={40} />
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name" title={user.displayName}>
              {user.displayName}
            </div>
            <div className="sidebar-user-handle" title={`@${user.username}`}>
              @{user.username}
            </div>
          </div>
        </div>

        <div className="sidebar-status">
          <span
            className={`sidebar-status-dot ${isOnline ? 'online' : 'offline'}`}
            aria-hidden
          />
          <span className="sidebar-status-text">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

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
              <span
                className="unread-badge"
                aria-label={`${unreadMessages} unread messages`}
              >
                {unreadMessages}
              </span>
            )}
          </button>
        ))}

        {isAdmin && (
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