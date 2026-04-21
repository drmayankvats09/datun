// ═══════════════════════════════════════════════════════════════
// AUTH CLIENT — Frontend auth utilities
// Token management, API calls, Google OAuth popup.
// Pattern: Clerk frontend SDK, Supabase JS client.
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Token Storage (localStorage) ──

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('datun_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('datun_refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('datun_access_token', accessToken);
  localStorage.setItem('datun_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('datun_access_token');
  localStorage.removeItem('datun_refresh_token');
}

// ── API Helper ──

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[]> };
}

async function authFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json()) as ApiResponse<T>;

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(url, { ...options, headers });
      return (await retryRes.json()) as ApiResponse<T>;
    }
    clearTokens();
  }

  return data;
}

// ── Auth API Calls ──

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export interface AuthResult {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  isNewUser: boolean;
}

export async function signup(
  email: string,
  password: string,
  name: string,
  phone?: string,
): Promise<ApiResponse<AuthResult>> {
  const result = await authFetch<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, phone }),
  });
  if (result.success && result.data) {
    setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }
  return result;
}

export async function login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
  const result = await authFetch<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (result.success && result.data) {
    setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }
  return result;
}

export async function sendOtp(
  destination: string,
  channel: 'email' | 'phone',
): Promise<
  ApiResponse<{ maskedDestination: string; expiresInSeconds: number; retryAfterSeconds: number }>
> {
  return authFetch('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ destination, channel }),
  });
}

export async function verifyOtp(
  destination: string,
  channel: 'email' | 'phone',
  code: string,
  name?: string,
): Promise<ApiResponse<AuthResult>> {
  const result = await authFetch<AuthResult>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ destination, channel, code, name }),
  });
  if (result.success && result.data) {
    setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }
  return result;
}

export async function loginWithGoogleCode(
  code: string,
  redirectUri: string,
): Promise<ApiResponse<AuthResult>> {
  const result = await authFetch<AuthResult>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code, redirectUri }),
  });
  if (result.success && result.data) {
    setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }
  return result;
}

export async function forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
  return authFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<ApiResponse<AuthResult>> {
  const result = await authFetch<AuthResult>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
  if (result.success && result.data) {
    setTokens(result.data.tokens.accessToken, result.data.tokens.refreshToken);
  }
  return result;
}

export async function getMe(): Promise<ApiResponse<AuthUser>> {
  return authFetch<AuthUser>('/auth/me');
}

export async function logout(): Promise<void> {
  // Blacklist token on backend (Redis) — token invalid on all devices
  try {
    await authFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Even if backend call fails, clear local tokens
  }
  clearTokens();
  window.location.href = '/login';
}

// ── Token Refresh ──

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>;

    if (data.success && data.data) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Google OAuth Popup ──

const GOOGLE_REDIRECT_PATH = '/auth/google/callback';

export function getGoogleRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${GOOGLE_REDIRECT_PATH}`;
}

export function openGoogleOAuthPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = getGoogleRedirectUri();
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      reject(new Error('Google OAuth not configured'));
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      url,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'google-oauth-code') {
        window.removeEventListener('message', handleMessage);
        popup.close();
        resolve(event.data.code as string);
      }
      if (event.data?.type === 'google-oauth-error') {
        window.removeEventListener('message', handleMessage);
        popup.close();
        reject(new Error(event.data.error as string));
      }
    };

    window.addEventListener('message', handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Popup closed'));
      }
    }, 500);
  });
}

// ── Auth State Check ──

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
