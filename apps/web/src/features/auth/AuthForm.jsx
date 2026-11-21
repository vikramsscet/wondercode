import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, TextField } from '../../components/ui/index.js';
import { useAuth } from './AuthContext.jsx';

export default function AuthForm({ mode }) {
  const isSignUp = mode === 'sign-up';
  const { user, signIn, signUp, isAuthConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/profiles" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    setError('');
    setNotice('');
    if (isSignUp && password.length < 8) {
      setError('Please use at least 8 characters for the password.');
      return;
    }
    setBusy(true);
    const result = isSignUp
      ? await signUp({ email, password, displayName: String(form.get('displayName')).trim() })
      : await signIn({ email, password });
    setBusy(false);
    if (result.error) {
      setError(
        isSignUp
          ? 'We could not create the account. Please check your details.'
          : 'Email or password is not correct.',
      );
    } else if (result.needsConfirmation) {
      setNotice('Almost there! Check your email and confirm your address, then sign in.');
    } else {
      navigate(location.state?.from ?? '/profiles', { replace: true });
    }
  }

  return (
    <Card as="section" className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold">
        {isSignUp ? 'Create parent account' : 'Parent sign in'}
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        A parent account manages your child's WonderCode profiles.
      </p>
      {!isAuthConfigured && (
        <Alert tone="warning" className="mt-3">
          Sign-in is not set up yet. Add the Supabase values to apps/web/.env.
        </Alert>
      )}
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {isSignUp && (
          <TextField
            label="Your name"
            name="displayName"
            required
            maxLength={60}
            autoComplete="name"
          />
        )}
        <TextField label="Email" name="email" type="email" required autoComplete="email" />
        <TextField
          label="Password"
          name="password"
          type="password"
          required
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          hint={isSignUp ? 'At least 8 characters.' : undefined}
        />
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={!isAuthConfigured}
          className="w-full"
        >
          {isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link to="/sign-in" className="font-bold text-brand-700 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link to="/sign-up" className="font-bold text-brand-700 underline">
              Create a parent account
            </Link>
          </>
        )}
      </p>
    </Card>
  );
}
