'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signup,
  openGoogleOAuthPopup,
  loginWithGoogleCode,
  getGoogleRedirectUri,
} from '@/lib/auth';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores';

export default function SignupPage() {
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
      toast.error('Please meet all password requirements');
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
        toast.success('Account created! Welcome to Datun AI');
        router.push('/');
      } else {
        toast.error(result.error?.message || 'Signup failed');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
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
        toast.success('Account created! Welcome to Datun AI');
        router.push('/');
      } else {
        toast.error(result.error?.message || 'Google signup failed');
      }
    } catch (err) {
      const message = (err as Error).message;
      if (message !== 'Popup closed') toast.error(message || 'Google signup failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  function PasswordRule({ met, label }: { met: boolean; label: string }) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {met ? (
          <Check className="text-primary h-3 w-3" />
        ) : (
          <X className="text-muted-foreground h-3 w-3" />
        )}
        <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        className="w-full py-6 text-base font-medium"
        onClick={handleGoogleSignup}
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
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">or create account</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Dr. Mayank Vats"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-phone">Phone Number (optional)</Label>
          <div className="flex gap-2">
            <div className="bg-muted text-muted-foreground flex items-center rounded-md px-3 text-sm font-medium">
              +91
            </div>
            <Input
              id="signup-phone"
              type="tel"
              placeholder="99531 35340"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              <PasswordRule met={hasMinLength} label="8+ characters" />
              <PasswordRule met={hasUppercase} label="Uppercase letter" />
              <PasswordRule met={hasLowercase} label="Lowercase letter" />
              <PasswordRule met={hasNumber} label="Number" />
            </div>
          )}
        </div>

        <Button type="submit" className="w-full py-5" disabled={loading || !isPasswordValid}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Account
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
