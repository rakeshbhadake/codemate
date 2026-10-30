import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth-context';
import { profileAPI } from '../../utils/api';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Terminal, Loader2, Check, X, ArrowRight, Mail,
  GitBranch, Cpu, Code2, Braces
} from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

interface PasswordRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPasswordRules(password: string): PasswordRules {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

function allRulesPassed(rules: PasswordRules): boolean {
  return Object.values(rules).every(Boolean);
}

function RuleRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${passed ? 'text-green-500' : 'text-muted-foreground'}`}>
      {passed
        ? <Check className="w-3 h-3 shrink-0 text-green-500" />
        : <X className="w-3 h-3 shrink-0 opacity-40" />}
      {label}
    </div>
  );
}

const SIDE_STATS = [
  { value: '2.4k+', label: 'Developers' },
  { value: '180+', label: 'Projects shipped' },
  { value: '94%', label: 'Match satisfaction' },
];

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const passwordRules = checkPasswordRules(formData.password);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;
  const canSubmit =
    allRulesPassed(passwordRules) &&
    passwordsMatch &&
    usernameStatus === 'available' &&
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'username') {
      if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
      const normalized = value.toLowerCase().trim();
      if (!normalized || normalized.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      setUsernameStatus('checking');
      const timeout = setTimeout(async () => {
        try {
          const result = await profileAPI.checkUsername(normalized);
          setUsernameStatus(result.available ? 'available' : 'taken');
        } catch {
          setUsernameStatus('idle');
        }
      }, 500);
      setUsernameCheckTimeout(timeout);
    }
  };

  useEffect(() => {
    return () => { if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout); };
  }, [usernameCheckTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (usernameStatus === 'taken') { setError('Username is already taken'); return; }
    if (!allRulesPassed(passwordRules)) { setError('Password does not meet all requirements'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        skills: [],
        bio: '',
        location: '',
        availability: 'available',
      });
      setRegistrationSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to <span className="font-medium text-foreground">{formData.email}</span>.
              Click the link to activate your account.
            </p>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 min-h-screen bg-[#09090f] dark:bg-[#050508] border-r border-[rgba(139,92,246,0.12)] p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25">
            <Terminal className="w-4 h-4 text-violet-400" />
          </span>
          <span className="font-mono font-bold text-base text-white tracking-tight">
            codemate<span className="text-violet-400 animate-pulse">_</span>
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="font-mono text-2xl font-bold text-white leading-snug">
              Your next<br />
              <span className="text-violet-400">coding partner</span><br />
              is one search away.
            </h1>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Join thousands of developers finding collaborators, shipping projects, and growing their network.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {SIDE_STATS.map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="font-mono text-lg font-bold text-violet-400">{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Cpu, label: 'AI Matching' },
              { icon: GitBranch, label: 'Collaborate' },
              { icon: Braces, label: 'Projects' },
              { icon: Code2, label: 'Community' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <f.icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <p className="font-mono text-[11px] font-medium text-white/70">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/25 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Free forever · No credit card required
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 py-4">

          <div className="lg:hidden flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-mono font-bold text-sm text-foreground">
              codemate<span className="text-primary">_</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Create your account</h2>
            <p className="text-sm text-muted-foreground">Join the developer community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
              <Input
                type="text"
                placeholder="Alex Chen"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                disabled={isLoading}
                className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="alexchen"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm pr-8"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {usernameStatus === 'available' && <Check className="w-3.5 h-3.5 text-green-500" />}
                  {usernameStatus === 'taken' && <X className="w-3.5 h-3.5 text-destructive" />}
                </span>
              </div>
              {usernameStatus === 'taken' && <p className="text-xs text-destructive">Username taken</p>}
              {usernameStatus === 'available' && <p className="text-xs text-green-500">Available!</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={isLoading}
                className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                disabled={isLoading}
                className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm"
              />
              {formData.password.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-3 grid grid-cols-2 gap-1.5">
                  <RuleRow passed={passwordRules.minLength} label="8+ characters" />
                  <RuleRow passed={passwordRules.hasUppercase} label="Uppercase" />
                  <RuleRow passed={passwordRules.hasLowercase} label="Lowercase" />
                  <RuleRow passed={passwordRules.hasNumber} label="Number" />
                  <RuleRow passed={passwordRules.hasSpecial} label="Special char" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm pr-8"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {passwordsMatch && <Check className="w-3.5 h-3.5 text-green-500" />}
                  {passwordMismatch && <X className="w-3.5 h-3.5 text-destructive" />}
                </span>
              </div>
              {passwordMismatch && <p className="text-xs text-destructive">{"Passwords don't match"}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <><span>Create account</span> <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="font-medium text-primary hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
