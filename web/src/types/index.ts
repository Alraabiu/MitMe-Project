export interface User {
  _id: string;
  displayName: string;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  presence?: 'online' | 'away' | 'dnd' | 'offline';
  status?: 'active' | 'suspended';
  role?: 'user' | 'moderator' | 'admin';
  lastSeen?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  code: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  host: User;
  participants?: string[];
  waitingRoom?: boolean;
  whiteboardEnabled?: boolean;
  chatEnabled?: boolean;
  screenShareEnabled?: boolean;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  title?: string;
  members: User[];
  lastMessageAt?: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  text?: string;
  createdAt?: string;
}

export interface WhiteboardEvent {
  type: string;
  payload: { points?: { x: number; y: number }[]; [k: string]: unknown };
  actor?: string;
  createdAt?: string;
}

export interface WhiteboardPage {
  _id: string;
  name: string;
  events: WhiteboardEvent[];
}

export interface Whiteboard {
  _id: string;
  meeting: string;
  pages: WhiteboardPage[];
  activePage?: string;
  editingMode?: 'everyone' | 'restricted';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}