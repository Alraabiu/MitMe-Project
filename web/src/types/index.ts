/* =========================================================
   USER
   ========================================================= */

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
  role?: string;
  lastSeen?: string;
}

/* =========================================================
   MEETING
   ========================================================= */

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

/* =========================================================
   CONVERSATION
   ========================================================= */

export interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'class';
  title?: string;
  members: User[];
  lastMessageAt?: string;
  classId?: string | null;
  schoolId?: string | null;
}

/* =========================================================
   MESSAGE
   ========================================================= */

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  text?: string;
  createdAt?: string;
}

/* =========================================================
   WHITEBOARD
   ========================================================= */

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

/* =========================================================
   AUTH
   ========================================================= */

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/* =========================================================
   SCHOOL
   ========================================================= */

export interface SchoolOwner {
  _id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

export interface School {
  _id: string;
  name: string;
  description?: string;
  code: string;
  owner: SchoolOwner | string;
  coverColor?: string;
  isArchived?: boolean;
  classCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolResponse {
  success: boolean;
  message?: string;
  data: {
    school: School;
  };
}

export interface SchoolListResponse {
  success: boolean;
  data: {
    schools: School[];
  };
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

export interface PendingRequest {
  _id: string;
  user: ClassStudent | string;
  requestedAt: string;
  message?: string;
}

export interface ClassItem {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  code: string;
  joinCode?: string;
  schoolId?: string | null;
  teacher: ClassTeacher;
  students: (ClassStudent | string)[];
  pendingRequests?: PendingRequest[];
  pendingCount?: number;
  memberCount?: number;
  messageCount?: number;
  isLive?: boolean;
  isOwner?: boolean;
  activeMeetingCode?: string | null;
  coverColor?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassResponse {
  success: boolean;
  message?: string;
  status?: 'pending' | 'joined';
  data: {
    class: ClassItem;
  };
}

export interface ClassListResponse {
  success: boolean;
  data: {
    classes: ClassItem[];
  };
}

/* =========================================================
   SCHOOL DETAIL (school + its classes)
   ========================================================= */

export interface SchoolDetailResponse {
  success: boolean;
  data: {
    school: School;
    classes: ClassItem[];
  };
}

/* =========================================================
   PENDING JOIN REQUEST (school-wide view)
   ========================================================= */

export interface SchoolJoinRequest {
  classId: string;
  className: string;
  classCode: string;
  user: ClassStudent;
  requestedAt: string;
  message?: string;
  requestId: string;
}

export interface SchoolRequestsResponse {
  success: boolean;
  data: {
    requests: SchoolJoinRequest[];
  };
}