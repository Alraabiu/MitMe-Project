import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, TOKEN_KEY, REFRESH_KEY } from '../constants';
import type { AuthResponse } from '../types';

/* =========================================================
   AXIOS INSTANCE
   ========================================================= */

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

console.log('[API] Base URL =', API_URL);

/* =========================================================
   TOKEN STORAGE
   ========================================================= */

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
};

export const setToken = async (
  access: string | null,
  refresh?: string | null
): Promise<void> => {
  try {
    if (access) {
      await SecureStore.setItemAsync(TOKEN_KEY, access);
      api.defaults.headers.common.Authorization = `Bearer ${access}`;
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      delete api.defaults.headers.common.Authorization;
    }
    if (refresh !== undefined) {
      if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
      else await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  } catch {
    /* ignore */
  }
};

export const rehydrateToken = async (): Promise<void> => {
  const token = await getToken();
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

/* =========================================================
   DEBUG LOGGING INTERCEPTORS
   ========================================================= */

api.interceptors.request.use((config) => {
  console.log(
    '[API →]',
    config.method?.toUpperCase(),
    (config.baseURL || '') + (config.url || '')
  );
  return config;
});

/* =========================================================
   AUTH REFRESH INTERCEPTOR
   ========================================================= */

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => {
    console.log('[API ←]', r.status, r.config?.url);
    return r;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    console.log(
      '[API ✗]',
      error?.message,
      error?.response?.status,
      error?.config?.url
    );

    if (!original || error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    const refresh = await getRefreshToken();
    if (!refresh) return Promise.reject(error);

    original._retried = true;

    try {
      if (!refreshing) {
        refreshing = axios
          .post<AuthResponse>(`${API_URL}/auth/refresh`, {
            refreshToken: refresh,
          })
          .then(async (r) => {
            // Tolerant parsing — supports both flat and nested shapes
            const root = (r.data as any)?.data ?? r.data;

            const access: string | null =
              root?.accessToken ??
              root?.token ??
              root?.access_token ??
              null;

            const refreshToken: string | null =
              root?.refreshToken ??
              root?.refresh_token ??
              null;

            if (!access) {
              throw new Error('Refresh response missing access token');
            }

            await setToken(access, refreshToken);
            return access;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      const newAccess = await refreshing;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshErr) {
      console.log('[API] Refresh failed, clearing tokens:', refreshErr);
      await setToken(null, null);
      return Promise.reject(error);
    }
  }
);

/* =========================================================
   RAW REQUEST HELPER
   ========================================================= */

export async function request<T = any>(
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const r = await api.request<T>({
    url: path,
    method,
    data: body ? JSON.parse(body) : undefined,
    headers,
  });
  return r.data;
}

/* =========================================================
   CONVENIENCE EXPORTS
   ========================================================= */

export const saveTokens = (access: string, refresh: string) =>
  setToken(access, refresh);

export const clearTokens = () => setToken(null, null);