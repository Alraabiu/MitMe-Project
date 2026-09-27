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
  role?: 'student' | 'teacher' | 'moderator' | 'admin';
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
  classId?: string | null;
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

/* =========================================================
   CLASS
   ========================================================= */

export interface ClassTeacher {
  _id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  role?: string;
}

export interface ClassStudent {
  _id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  role?: string;
}

export interface ClassItem {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  code: string;
  teacher: ClassTeacher;
  students: (ClassStudent | string)[];
  coverColor?: string;
  isArchived?: boolean;
  isLive?: boolean;
  activeMeetingCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
