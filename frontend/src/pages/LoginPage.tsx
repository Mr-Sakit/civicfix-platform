import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface LoginPageProps {
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('resident.demo@civicfix.local');
  const [password, setPassword] = useState('resident-demo');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch {
      setError('Invalid login. Use one of the demo accounts below.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyDemoCredentials = (role: 'citizen' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin.demo@civicfix.local');
      setPassword('admin-demo');
    } else {
      setEmail('resident.demo@civicfix.local');
      setPassword('resident-demo');
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-gutter py-xl">
      <section className="w-full max-w-xl">
        <form onSubmit={submit} className="bg-white p-lg sm:p-xl flex flex-col justify-center gap-lg">
          <div>
            <div className="flex items-center gap-sm mb-lg">
              <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
              <span className="text-3xl font-extrabold tracking-tight text-on-surface">CivicFix</span>
            </div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface mt-xs">Sign in to CivicFix</h2>
            <p className="text-on-surface-variant mt-xs text-body-md">
              Sign in as a citizen, city manager, or crew member.
            </p>
          </div>

          <div className="space-y-md">
            <label className="block">
              <span className="text-label-md font-bold text-on-surface-variant">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                type="email"
                autoComplete="username"
              />
            </label>
            <label className="block">
              <span className="text-label-md font-bold text-on-surface-variant">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                type="password"
                autoComplete="current-password"
              />
            </label>
          </div>

          {error && <div className="bg-error-container text-on-error-container rounded-xl p-md text-sm">{error}</div>}

          <button
            disabled={isSubmitting}
            className="h-14 rounded-xl bg-primary text-on-primary font-bold shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('/signup')}
            className="text-center text-sm text-primary font-semibold hover:underline"
          >
            New here? Create an account
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <button type="button" onClick={() => applyDemoCredentials('citizen')} className="rounded-xl border border-outline-variant p-md text-left hover:bg-surface-container">
              <div className="font-bold text-on-surface">Citizen demo</div>
              <div className="text-xs text-on-surface-variant">resident.demo@civicfix.local</div>
            </button>
            <button type="button" onClick={() => applyDemoCredentials('admin')} className="rounded-xl border border-outline-variant p-md text-left hover:bg-surface-container">
              <div className="font-bold text-on-surface">Manager demo</div>
              <div className="text-xs text-on-surface-variant">admin.demo@civicfix.local</div>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
