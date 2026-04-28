import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeToken, isTokenExpired, tokenExpiresAt, JwtPayload } from '../utils/tokenUtils';

const LOGIN_API_URL = process.env.EXPO_PUBLIC_LOGIN_URL ?? 'https://localhost:7228';

const AVATAR_KEY = '@cf_avatar';

// Instância axios autenticada apontando para a API de login
const loginApi = axios.create({
  baseURL: LOGIN_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
loginApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  expiresAt: Date | null;
}

export const authService = {
  async login(email: string, password: string): Promise<string> {
    const { data } = await axios.post(`${LOGIN_API_URL}/user/authenticate`, {
      email,
      password,
      captcha: null,
      termName: null,
    });
    const token: string = data.accessToken;
    await AsyncStorage.setItem('@cf_token', token);
    // Persiste o avatar retornado no login
    await AsyncStorage.setItem(AVATAR_KEY, data.avatarUrl ?? '');
    return token;
  },

  async getToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@cf_token');
    if (!token) return null;
    if (isTokenExpired(token)) {
      await AsyncStorage.removeItem('@cf_token');
      return null;
    }
    return token;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('@cf_token');
    await AsyncStorage.removeItem(AVATAR_KEY);
  },

  async getUserInfo(): Promise<UserInfo | null> {
    const token = await AsyncStorage.getItem('@cf_token');
    if (!token) return null;
    const payload: JwtPayload | null = decodeToken(token);
    if (!payload) return null;
    const avatarUrl = (await AsyncStorage.getItem(AVATAR_KEY)) || null;
    return {
      id: payload.nameid ?? '',
      name: payload.unique_name ?? '',
      email: payload.email ?? '',
      avatarUrl,
      expiresAt: tokenExpiresAt(token),
    };
  },

  async isAdmin(): Promise<boolean> {
    const token = await AsyncStorage.getItem('@cf_token');
    if (!token) return false;
    const payload = decodeToken(token);
    return payload?.userType === '1';
  },

  async register(
    inviteToken: string,
    name: string,
    email: string,
    password: string,
    document?: string,
  ): Promise<string> {
    const { data } = await axios.post(`${LOGIN_API_URL}/user/register`, {
      inviteToken,
      name,
      email,
      password,
      document: document ?? null,
    });
    const token: string = data.accessToken;
    await AsyncStorage.setItem('@cf_token', token);
    await AsyncStorage.setItem(AVATAR_KEY, data.avatarUrl ?? '');
    return token;
  },

  /** Atualiza o avatar no backend e na cache local. */
  async updateAvatar(dataUrl: string | null): Promise<void> {
    await loginApi.patch('/user/me/avatar', { avatarUrl: dataUrl });
    await AsyncStorage.setItem(AVATAR_KEY, dataUrl ?? '');
  },
};
