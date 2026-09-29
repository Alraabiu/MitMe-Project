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
    role?: 'user' | 'student' | 'teacher' | 'moderator' | 'admin';
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
}

/* =========================================================
   CONVERSATION
   ========================================================= */

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  title?: string;
  members: User[];
  lastMessageAt?: string;
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

/**
 * Tolerant auth response type.
 * Supports multiple backend response shapes:
 *   A) { accessToken, refreshToken, user }
 *   B) { token, refreshToken, user }
 *   C) { success: true, data: { accessToken, refreshToken, user } }
 *   D) { success: true, data: { token, refreshToken, user } }
 *
 * Your login code reads fields defensively, so any of these work.
 */
export interface AuthResponse {
  // Shape A / B — flat
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;

  // Envelope
  success?: boolean;
  message?: string;

  // Shape C / D — nested under `data`
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
   API RESPONSE ENVELOPE (generic)
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
   WALLET / PAYMENTS (optional — for future use)
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

export interface Class {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  code: string;
  teacher: ClassTeacher;
  students: (ClassStudent | string)[];
  coverColor?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassResponse {
  success: boolean;
  message?: string;
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