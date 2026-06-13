'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/feedback/loading-button';
import {
  signup,
  openGoogleOAuthPopup,
  loginWithGoogleCode,
  getGoogleRedirectUri,
} from '@/lib/auth';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { GoogleIcon } from '@/components/google-icon';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

// P4-F8: Moved outside component — stable reference, no re-creation per render
function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {met ? (
        <Check className="h-3 w-3 text-primary" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (!isPasswordValid) {
      toast.error(t('passwordRequirements'));
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = phone
        ? phone.startsWith('+91')
          ? phone
          : `+91${phone.replace(/\D/g, '')}`
        : undefined;
      const result = await signup(email, password, name, cleanPhone);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(t('welcome'));
        router.push('/');
      } else {
        toast.error(result.error?.message || t('signupFailed'));
      }
    } catch {
      toast.error(t('signupFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    try {
      const code = await openGoogleOAuthPopup();
      const redirectUri = getGoogleRedirectUri();
      const result = await loginWithGoogleCode(code, redirectUri);
      if (result.success) {
        if (result.data?.user) setUser(result.data.user);
        toast.success(t('welcome'));
        router.push('/');
      } else {
        toast.error(result.error?.message || t('signupFailed'));
      }
    } catch (err) {
      const message = (err as Error).message;
      if (message !== 'Popup closed') toast.error(message || t('signupFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="w-full py-6 text-base font-medium"
        onClick={handleGoogleSignup}
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

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <Input
            id="name"
            type="text"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">{t('emailLabel')}</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-phone">{t('phoneLabel')}</Label>
          <div className="flex gap-2">
            <div className="flex items-center rounded-md bg-muted px-3 text-sm font-medium text-foreground">
              +91
            </div>
            <Input
              id="signup-phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              autoComplete="tel"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">{t('passwordLabel')}</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="pr-10"
            />
            {/* W3-C `button-name` (w10): icon-only control gets an accessible
                name + keyboard focus (tabIndex=-1 removed). English literals
                for now — localized keys land with Task #54. */}
            {/* Task #54 E2E: 32px hit-box for the 24px floor (SC 2.5.8). */}
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
          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              <PasswordRule met={hasMinLength} label={t('passwordRules.minLength')} />
              <PasswordRule met={hasUppercase} label={t('passwordRules.uppercase')} />
              <PasswordRule met={hasLowercase} label={t('passwordRules.lowercase')} />
              <PasswordRule met={hasNumber} label={t('passwordRules.number')} />
            </div>
          )}
        </div>
        <LoadingButton
          type="submit"
          className="w-full py-5"
          disabled={!isPasswordValid}
          loading={loading}
        >
          {t('createButton')}
        </LoadingButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('signInLink')}
        </Link>
      </p>
    </div>
  );
}
