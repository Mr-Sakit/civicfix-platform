import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
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

  const useDemo = (role: 'citizen' | 'admin') => {
    if (role === 'admin') {
      setEmail('admin.demo@civicfix.local');
      setPassword('admin-demo');
    } else {
      setEmail('resident.demo@civicfix.local');
      setPassword('resident-demo');
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-gutter py-xl">
      <section className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/30">
        <div className="bg-on-background text-white p-xl flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center gap-sm mb-xl">
              <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
              <span className="text-2xl font-extrabold tracking-tight">CivicFix</span>
            </div>
            <h1 className="text-display-md font-display-md leading-tight">
              One platform for citizens and city operations.
            </h1>
            <p className="mt-md text-surface-variant max-w-md">
              Citizens submit reports with photos and GPS. City managers triage, assign teams, and monitor the live issue map.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-sm text-xs text-surface-variant">
            <div className="bg-white/10 rounded-xl p-sm">Role-based access</div>
            <div className="bg-white/10 rounded-xl p-sm">GPS reports</div>
            <div className="bg-white/10 rounded-xl p-sm">Real uploads</div>
          </div>
        </div>

        <form onSubmit={submit} className="p-xl flex flex-col justify-center gap-lg">
          <div>
            <p className="text-primary font-bold text-label-md uppercase tracking-widest">Secure demo login</p>
            <h2 className="text-headline-lg font-headline-lg text-on-surface mt-xs">Sign in to CivicFix</h2>
            <p className="text-on-surface-variant mt-xs text-body-md">
              Choose a citizen or city manager account to open the matching interface.
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
            className="h-12 rounded-xl bg-primary text-on-primary font-bold shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <button type="button" onClick={() => useDemo('citizen')} className="rounded-xl border border-outline-variant p-md text-left hover:bg-surface-container">
              <div className="font-bold text-on-surface">Citizen demo</div>
              <div className="text-xs text-on-surface-variant">resident.demo@civicfix.local</div>
            </button>
            <button type="button" onClick={() => useDemo('admin')} className="rounded-xl border border-outline-variant p-md text-left hover:bg-surface-container">
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
