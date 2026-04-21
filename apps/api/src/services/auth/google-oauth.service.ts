// ═══════════════════════════════════════════════════════════════
// GOOGLE OAUTH SERVICE — Direct OAuth 2.0, no Auth0
// Frontend opens popup → user consents → Google sends code
// → Backend exchanges code for tokens → gets user profile
// → Creates/finds user → issues Datun JWT
// Pattern: Zomato, Practo, every FAANG login page.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export class GoogleOAuthService {
  /**
   * Exchange authorization code for Google user info.
   */
  static async exchangeCodeForUser(code: string, redirectUri: string): Promise<GoogleUserInfo> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error(
        'Google OAuth not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required',
      );
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post(
      GOOGLE_TOKEN_URL,
      {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
      },
    );

    const accessToken = tokenResponse.data.access_token as string;

    if (!accessToken) {
      logger.error('Google OAuth: no access_token in response', {
        status: tokenResponse.status,
      });
      throw new Error('Failed to get access token from Google');
    }

    // Step 2: Fetch user profile
    const userResponse = await axios.get(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10_000,
    });

    const data = userResponse.data as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!data.email) {
      throw new Error('Google account does not have an email address');
    }

    logger.info('Google OAuth: user info fetched', {
      googleId: data.id,
      email: data.email,
    });

    return {
      id: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0] || 'User',
      picture: data.picture || null,
      emailVerified: data.verified_email ?? false,
    };
  }

  /**
   * Build the Google OAuth consent URL for frontend popup.
   */
  static getConsentUrl(redirectUri: string, state?: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    if (state) params.set('state', state);

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}
