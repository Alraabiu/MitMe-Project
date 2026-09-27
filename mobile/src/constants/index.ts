import Constants from 'expo-constants';

const PROD_API_URL = 'https://mitme-project.onrender.com/api';
const PROD_SOCKET_URL = 'https://mitme-project.onrender.com';

const HARDCODED_LAN_IP = '192.168.20.78';

const guessHost = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as {
      manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    }).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
  }

  return HARDCODED_LAN_IP;
};

const HOST = guessHost();

const DEV_API_URL = `http://${HOST}:5000/api`;
const DEV_SOCKET_URL = `http://${HOST}:5000`;

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? DEV_API_URL : PROD_API_URL);

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (__DEV__ ? DEV_SOCKET_URL : PROD_SOCKET_URL);

export const TOKEN_KEY = 'mitme_access';
export const REFRESH_KEY = 'mitme_refresh';

if (__DEV__) {
  console.log('[MitMe] API_URL =', API_URL);
  console.log('[MitMe] SOCKET_URL =', SOCKET_URL);
}