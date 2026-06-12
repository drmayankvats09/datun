'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/feedback/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  login,
  sendOtp,
  verifyOtp,
  openGoogleOAuthPopup,
  loginWithGoogleCode,
  getGoogleRedirectUri,
} from '@/lib/auth';
import { GoogleIcon } from '@/components/google-icon';
import { Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const searchParams = useSearchParams();
  // P4-F7: Honor returnTo param (with open-redirect prevention)
  const rawReturnTo = searchParams.get('returnTo') || '/';
  const safeReturnTo =
    rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // P4-F4: Track interval for cleanup on unmount
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(t('welcomeBack'));
        router.push(safeReturnTo);
      } else {
        toast.error(result.error?.message || t('loginFailed'));
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const cleanPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;
    if (cleanPhone.length < 13) {
      toast.error(t('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp(cleanPhone, 'phone');
      if (result.success && result.data) {
        setOtpSent(true);
        toast.success(`OTP sent to ${result.data.maskedDestination}`);
        let seconds = result.data.retryAfterSeconds || 60;
        setOtpCooldown(seconds);
        // P4-F4: Clear previous interval + track for cleanup
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          seconds--;
          setOtpCooldown(seconds);
          if (seconds <= 0 && cooldownRef.current) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
          }
        }, 1000);
      } else {
        toast.error(result.error?.message || t('genericError'));
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    const cleanPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;
    setLoading(true);
    try {
      const result = await verifyOtp(cleanPhone, 'phone', otp);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(result.data?.isNewUser ? t('accountCreated') : t('welcomeBack'));
        router.push(safeReturnTo);
      } else {
        toast.error(result.error?.message || t('invalidOtp'));
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const code = await openGoogleOAuthPopup();
      const redirectUri = getGoogleRedirectUri();
      const result = await loginWithGoogleCode(code, redirectUri);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(result.data?.isNewUser ? t('accountCreated') : t('welcomeBack'));
        router.push(safeReturnTo);
      } else {
        toast.error(result.error?.message || t('loginFailed'));
      }
    } catch (err) {
      const message = (err as Error).message;
      if (message !== 'Popup closed') toast.error(message || t('loginFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="w-full py-6 text-base font-medium"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
      >
        {googleLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon />}
        {t('googleButton')}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('orDivider')}</span>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            {t('emailTab')}
          </TabsTrigger>
          <TabsTrigger value="phone" className="gap-2">
            <Phone className="h-4 w-4" />
            {t('phoneTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                {/* W3-C `button-name` (w10): icon-only control gets an accessible
                    name + keyboard focus (tabIndex=-1 removed). English literals
                    for now — localized keys land with Task #54.
                    Task #54 E2E: 32px hit-box for the 24px floor (SC 2.5.8);
                    right-1.5 keeps the icon visually in place. */}
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <LoadingButton type="submit" className="w-full py-5" loading={loading}>
              {t('signInButton')}
            </LoadingButton>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <div className="space-y-4 pt-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phoneLabel')}</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center rounded-md bg-muted px-3 text-sm font-medium text-foreground">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t('phonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <LoadingButton
                  className="w-full py-5"
                  onClick={handleSendOtp}
                  disabled={phone.replace(/\D/g, '').length < 10}
                  loading={loading}
                >
                  {t('sendOtp')}
                </LoadingButton>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  {t('otpSent', { phone })}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otp">{t('otpLabel')}</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder={t('otpPlaceholder')}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center font-mono text-2xl tracking-[0.5em]"
                    autoFocus
                  />
                </div>
                <LoadingButton
                  type="submit"
                  className="w-full py-5"
                  disabled={otp.length !== 6}
                  loading={loading}
                >
                  {t('verifyButton')}
                </LoadingButton>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    onClick={handleSendOtp}
                    disabled={otpCooldown > 0 || loading}
                  >
                    {otpCooldown > 0 ? t('resendIn', { seconds: otpCooldown }) : t('resendOtp')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t('signUpLink')}
        </Link>
      </p>
    </div>
  );
}
