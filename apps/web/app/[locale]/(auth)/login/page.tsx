'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
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
import { Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
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

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(t('welcomeBack'));
        router.push('/');
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
        const interval = setInterval(() => {
          seconds--;
          setOtpCooldown(seconds);
          if (seconds <= 0) clearInterval(interval);
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
        router.push('/');
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
        router.push('/');
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
        {googleLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        {t('googleButton')}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">{t('orDivider')}</span>
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
                  className="text-primary text-xs font-medium hover:underline"
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
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full py-5" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('signInButton')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <div className="space-y-4 pt-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phoneLabel')}</Label>
                  <div className="flex gap-2">
                    <div className="bg-muted text-muted-foreground flex items-center rounded-md px-3 text-sm font-medium">
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
                <Button
                  className="w-full py-5"
                  onClick={handleSendOtp}
                  disabled={loading || phone.replace(/\D/g, '').length < 10}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('sendOtp')}
                </Button>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-muted-foreground text-center text-sm">
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
                <Button
                  type="submit"
                  className="w-full py-5"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('verifyButton')}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
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

      <p className="text-muted-foreground text-center text-sm">
        {t('noAccount')}{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          {t('signUpLink')}
        </Link>
      </p>
    </div>
  );
}
