import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeToken, isTokenExpired, tokenExpiresAt, JwtPayload } from '../utils/tokenUtils';

const LOGIN_API_URL = process.env.EXPO_PUBLIC_LOGIN_URL ?? 'https://localhost:7228';

export interface UserInfo {
  id: string;
  email: string;
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
    return token;
  },

  async getToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('@cf_token');
    if (!token) return null;
    // Se expirou localmente, já limpa antes de qualquer chamada
    if (isTokenExpired(token)) {
      await AsyncStorage.removeItem('@cf_token');
      return null;
    }
    return token;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('@cf_token');
  },

  async getUserInfo(): Promise<UserInfo | null> {
    const token = await AsyncStorage.getItem('@cf_token');
    if (!token) return null;
    const payload: JwtPayload | null = decodeToken(token);
    if (!payload) return null;
    return {
      id: payload.nameid ?? '',
      email: payload.email ?? '',
      expiresAt: tokenExpiresAt(token),
    };
  },
};
