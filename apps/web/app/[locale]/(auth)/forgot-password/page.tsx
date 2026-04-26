'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword, resetPassword } from '@/lib/auth';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
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
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToSignIn')}
      </Link>

      {step === 'email' && (
        <>
          <div>
            <h2 className="text-foreground text-xl font-semibold">{t('title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
          </div>
          <form onSubmit={handleSendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">
                {t('sendButton').replace('Send Reset Code', 'Email')}
              </Label>
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
            <Button type="submit" className="w-full py-5" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('sendButton')}
            </Button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <>
          <div>
            <h2 className="text-foreground text-xl font-semibold">{t('checkEmail')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('checkEmailDesc', { email })}</p>
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
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-muted-foreground text-xs">{t('newPasswordHint')}</p>
            </div>
            <Button
              type="submit"
              className="w-full py-5"
              disabled={loading || otp.length !== 6 || newPassword.length < 8}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('resetButton')}
            </Button>
            <button
              type="button"
              className="text-primary block w-full text-center text-sm font-medium hover:underline"
              onClick={() => setStep('email')}
            >
              {t('didntReceive')}
            </button>
          </form>
        </>
      )}

      {step === 'success' && (
        <div className="py-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-primary h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-foreground text-xl font-semibold">{t('successTitle')}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t('successDesc')}</p>
        </div>
      )}
    </div>
  );
}
