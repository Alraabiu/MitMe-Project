import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types';

// Priority: VITE_API_URL -> absolute fallback to localhost:5000
const ENV_API_URL =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL;

const API_URL = ENV_API_URL && ENV_API_URL.length > 0
  ? ENV_API_URL
  : 'http://localhost:5000/api';

const TOKEN_KEY = 'mitme_access';
const REFRESH_KEY = 'mitme_refresh';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Token helpers ---
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_KEY);

export const setToken = (
  access: string | null,
  refresh?: string | null
): void => {
  if (access) {
    localStorage.setItem(TOKEN_KEY, access);
    api.defaults.headers.common.Authorization = `Bearer ${access}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
};

// Rehydrate on module load
const existing = getToken();
if (existing) api.defaults.headers.common.Authorization = `Bearer ${existing}`;

// --- Auto-refresh interceptor ---
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };
    const status = error.response?.status;

    if (status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    const refresh = getRefreshToken();
    if (!refresh) return Promise.reject(error);

    original._retried = true;

    try {
      if (!refreshing) {
        refreshing = axios
          .post<AuthResponse>(`${API_URL}/auth/refresh`, {
            refreshToken: refresh,
          })
          .then((r) => {
            setToken(r.data.accessToken, r.data.refreshToken);
            return r.data.accessToken;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      const newAccess = await refreshing;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      setToken(null, null);
      window.location.reload();
      return Promise.reject(error);
    }
  }
);