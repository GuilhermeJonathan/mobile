import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeToken, isTokenExpired, tokenExpiresAt, JwtPayload } from '../utils/tokenUtils';

const LOGIN_API_URL = process.env.EXPO_PUBLIC_LOGIN_URL ?? 'https://localhost:7228';

const AVATAR_KEY        = '@cf_avatar';
const PLAN_KEY          = '@cf_plan';
const REFRESH_TOKEN_KEY = '@cf_refresh_token';

export interface PlanInfo {
  hasPaidPlan: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
}

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
    if (data.refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    await AsyncStorage.setItem(AVATAR_KEY, data.avatarUrl ?? '');
    if (data.planInfo) {
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(data.planInfo));
    }
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
    await AsyncStorage.multiRemove(['@cf_token', REFRESH_TOKEN_KEY, AVATAR_KEY, PLAN_KEY]);
  },

  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;
      const { data } = await axios.post(`${LOGIN_API_URL}/user/refresh`, { refreshToken });
      await AsyncStorage.setItem('@cf_token', data.accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      return data.accessToken as string;
    } catch {
      return null;
    }
  },

  async getPlanInfo(): Promise<PlanInfo | null> {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as PlanInfo; } catch { return null; }
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

  /** Cadastro público sem convite (landing page). Inicia trial de 30 dias. */
  async selfRegister(
    name: string,
    email: string,
    password: string,
  ): Promise<string> {
    const { data } = await axios.post(`${LOGIN_API_URL}/user/selfregister`, {
      name,
      email,
      password,
      document: null,
    });
    const token: string = data.accessToken;
    await AsyncStorage.setItem('@cf_token', token);
    await AsyncStorage.setItem(AVATAR_KEY, data.avatarUrl ?? '');
    if (data.planInfo) {
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(data.planInfo));
    }
    return token;
  },

  /** Atualiza o avatar no backend e na cache local. */
  async updateAvatar(dataUrl: string | null): Promise<void> {
    await loginApi.patch('/user/me/avatar', { avatarUrl: dataUrl });
    await AsyncStorage.setItem(AVATAR_KEY, dataUrl ?? '');
  },

  /** Altera a senha do usuário autenticado. Lança erro se a senha atual estiver incorreta. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await loginApi.patch('/user/me/password', { currentPassword, newPassword });
  },

  /** Solicita e-mail de recuperação de senha. Nunca lança erro visível ao usuário (evita enumeração). */
  async forgotPassword(email: string): Promise<void> {
    await axios.post(`${LOGIN_API_URL}/user/forgotPassword`, { identificador: email });
  },

  /** Redefine a senha usando o token recebido por e-mail. */
  async resetPassword(email: string, token: string, password: string): Promise<void> {
    await axios.put(`${LOGIN_API_URL}/user/password`, { email, password, token, termName: null });
  },
};
