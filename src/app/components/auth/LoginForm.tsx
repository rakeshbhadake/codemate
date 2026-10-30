import React, { useState } from 'react';
import { useAuth } from '../../utils/auth-context';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Terminal, Loader2, ArrowRight, Code2, Braces, GitBranch, Cpu } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const FLOATING_SNIPPETS = [
  { top: '12%', left: '8%', code: 'const match = await\n  ai.findPartner(me);', delay: '0s' },
  { top: '55%', left: '5%', code: 'git commit -m\n  "found my pair"', delay: '1.2s' },
  { top: '78%', left: '12%', code: 'npm run\n  collaborate', delay: '0.6s' },
  { top: '28%', left: '72%', code: 'while (!done) {\n  buildTogether();\n}', delay: '1.8s' },
  { top: '68%', left: '68%', code: '> codemate connect\n  Matching...', delay: '0.9s' },
];

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">

      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 min-h-screen bg-[#09090f] dark:bg-[#050508] border-r border-[rgba(139,92,246,0.12)] p-10 relative overflow-hidden">

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating code snippets */}
        {FLOATING_SNIPPETS.map((s, i) => (
          <div
            key={i}
            className="absolute font-mono text-[10px] text-violet-400/25 leading-relaxed whitespace-pre select-none pointer-events-none"
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          >
            {s.code}
          </div>
        ))}

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25">
            <Terminal className="w-4 h-4 text-violet-400" />
          </span>
          <span className="font-mono font-bold text-base text-white tracking-tight">
            codemate<span className="text-violet-400 animate-pulse">_</span>
          </span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="font-mono text-2xl font-bold text-white leading-snug">
              Build better,<br />
              <span className="text-violet-400">together.</span>
            </h1>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              AI-powered matching connects you with developers whose skills complement yours. Ship faster.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Cpu, label: 'AI Matching', desc: 'Semantic search' },
              { icon: GitBranch, label: 'Collaborate', desc: 'Real-time chat' },
              { icon: Braces, label: 'Projects', desc: 'Team up on work' },
              { icon: Code2, label: 'Community', desc: 'Posts & events' },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <f.icon className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-[11px] font-semibold text-white/80">{f.label}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/25 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Developers online now
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-7">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-mono font-bold text-sm text-foreground">
              codemate<span className="text-primary">_</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 bg-input-background border-border focus-visible:ring-primary/40 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <><span>Sign in</span> <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {"Don't have an account?"}{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-medium text-primary hover:underline"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
