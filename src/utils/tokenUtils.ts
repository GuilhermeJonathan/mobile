export interface JwtPayload {
  nameid?: string;   // ClaimTypes.NameIdentifier
  unique_name?: string; // ClaimTypes.Name
  email?: string;    // ClaimTypes.Email
  userType?: string;
  exp?: number;
  iss?: string;
}

// Decodifica Base64URL sem depender de atob (Hermes/RN)
function base64UrlDecode(str: string): string {
  // Base64URL → Base64
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';

  // Decodifica manualmente
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < b64.length) {
    const a = chars.indexOf(b64[i++]);
    const b = chars.indexOf(b64[i++]);
    const c = chars.indexOf(b64[i++]);
    const d = chars.indexOf(b64[i++]);
    if (a < 0 || b < 0) break;
    result += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d >= 0) result += String.fromCharCode(((c & 3) << 6) | d);
  }
  // Decodifica UTF-8
  try {
    return decodeURIComponent(
      result.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    return result;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(base64UrlDecode(parts[1]));
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  // exp é em segundos UTC
  return Date.now() / 1000 > payload.exp;
}

export function tokenExpiresAt(token: string): Date | null {
  const payload = decodeToken(token);
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
}
