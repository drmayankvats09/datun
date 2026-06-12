'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/feedback/loading-button';
import { Label } from '@/components/ui/label';
import { forgotPassword, resetPassword } from '@/lib/auth';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('otp');
      toast.success(t('codeSent'));
    } catch {
      toast.error(t('resetFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6 || newPassword.length < 8) return;
    setLoading(true);
    try {
      const result = await resetPassword(email, otp, newPassword);
      if (result.success) {
        setStep('success');
        toast.success(t('successTitle'));
        setTimeout(() => router.push('/'), 1500);
      } else {
        toast.error(result.error?.message || t('resetFailed'));
      }
    } catch {
      toast.error(t('resetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToSignIn')}
      </Link>

      {step === 'email' && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
          </div>
          <form onSubmit={handleSendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('emailLabel')}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <LoadingButton type="submit" className="w-full py-5" loading={loading}>
              {t('sendButton')}
            </LoadingButton>
          </form>
        </>
      )}

      {step === 'otp' && (
        <>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('checkEmail')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('checkEmailDesc', { email })}</p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-otp">{t('checkEmail')}</Label>
              <Input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center font-mono text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
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
              <p className="text-xs text-muted-foreground">{t('newPasswordHint')}</p>
            </div>
            <LoadingButton
              type="submit"
              className="w-full py-5"
              disabled={otp.length !== 6 || newPassword.length < 8}
              loading={loading}
            >
              {t('resetButton')}
            </LoadingButton>
            <button
              type="button"
              className="block w-full text-center text-sm font-medium text-primary hover:underline"
              onClick={() => setStep('email')}
            >
              {t('didntReceive')}
            </button>
          </form>
        </>
      )}

      {step === 'success' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('successTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('successDesc')}</p>
        </div>
      )}
    </div>
  );
}
