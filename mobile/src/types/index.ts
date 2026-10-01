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
   AUTH
   ========================================================= */

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;

  success?: boolean;
  message?: string;

  data?: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
    access_token?: string;
    refresh_token?: string;
    user?: User;
  };
}

/* =========================================================
   API ENVELOPE
   ========================================================= */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

/* =========================================================
   PAGINATION
   ========================================================= */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* =========================================================
   WALLET (reserved)
   ========================================================= */

export interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  reference?: string;
  status?: string;
  createdAt?: string;
}

export interface Wallet {
  _id: string;
  balance: number;
  currency?: string;
  transactions?: Transaction[];
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

export interface Class {
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
    class: Class;
  };
}

export interface ClassListResponse {
  success: boolean;
  data: {
    classes: Class[];
  };
}

/* =========================================================
   SCHOOL DETAIL (school + its classes)
   ========================================================= */

export interface SchoolDetailResponse {
  success: boolean;
  data: {
    school: School;
    classes: Class[];
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