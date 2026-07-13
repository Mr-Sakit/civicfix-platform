import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { civicfixApi } from '../services/api';
import type { BackendTeam } from '../services/api';

interface SignupPageProps {
  onNavigate: (path: string) => void;
}

type Role = 'citizen' | 'admin' | 'crew';

const COMPANY_DOMAIN = '@civicfix.local';

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup } = useApp();
  const [role, setRole] = useState<Role>('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [teams, setTeams] = useState<BackendTeam[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role === 'crew') {
      civicfixApi.getTeams().then(setTeams).catch(() => setTeams([]));
    }
  }, [role]);

  const requiresCompanyEmail = role !== 'citizen';
  const emailLooksValid = !requiresCompanyEmail || email.toLowerCase().endsWith(COMPANY_DOMAIN);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (requiresCompanyEmail && !emailLooksValid) {
      setError(`Admin and crew accounts require a ${COMPANY_DOMAIN} company email.`);
      return;
    }
    if (role === 'crew' && !teamId) {
      setError('Please select which crew you belong to.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        fullName,
        email,
        password,
        role,
        teamId: role === 'crew' ? Number(teamId) : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
            <h2 className="text-headline-lg font-headline-lg text-on-surface mt-xs">Create your account</h2>
            <p className="text-on-surface-variant mt-xs text-body-md">
              Choose the account type that matches your role.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-sm">
            {(['citizen', 'admin', 'crew'] as Role[]).map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setRole(option)}
                className={`h-12 rounded-xl border-2 font-bold text-sm capitalize transition-all ${
                  role === option
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="space-y-md">
            <label className="block">
              <span className="text-label-md font-bold text-on-surface-variant">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                type="text"
                required
              />
            </label>
            <label className="block">
              <span className="text-label-md font-bold text-on-surface-variant">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                type="email"
                autoComplete="username"
                required
              />
              {requiresCompanyEmail && (
                <span className="text-xs text-on-surface-variant mt-1 block">
                  {role === 'admin' ? 'Admin' : 'Crew'} accounts require a {COMPANY_DOMAIN} company email.
                </span>
              )}
            </label>
            {role === 'crew' && (
              <label className="block">
                <span className="text-label-md font-bold text-on-surface-variant">Which crew are you?</span>
                <select
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value ? Number(event.target.value) : '')}
                  className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                  required
                >
                  <option value="">Select a crew...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-label-md font-bold text-on-surface-variant">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-xs w-full h-12 px-md rounded-xl border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          {error && <div className="bg-error-container text-on-error-container rounded-xl p-md text-sm">{error}</div>}

          <button
            disabled={isSubmitting}
            className="h-14 rounded-xl bg-primary text-on-primary font-bold shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="text-center text-sm text-primary font-semibold hover:underline"
          >
            Already have an account? Sign in
          </button>
        </form>
      </section>
    </main>
  );
};

export default SignupPage;
