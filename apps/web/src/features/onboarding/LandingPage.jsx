import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, buttonClasses } from '../../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGuest } from '../guest/GuestContext.jsx';

const steps = [
  {
    icon: '💡',
    title: 'Imagine it',
    text: 'Tell WonderCode your idea: a game, a quiz, a calculator, anything.',
  },
  {
    icon: '🛠️',
    title: 'Build it',
    text: 'Watch your idea turn into a real working app, made with you.',
  },
  { icon: '🔍', title: 'Explore it', text: 'Look inside the code and see how every part works.' },
  {
    icon: '🧠',
    title: 'Understand it',
    text: 'Ask the AI Teacher, change things and learn by trying.',
  },
];

function Hero() {
  return (
    <header className="text-center">
      <h1 className="text-4xl font-extrabold leading-tight text-brand-800 sm:text-6xl">
        Imagine it. Build it.
        <br />
        <span className="text-brand-600">Understand it.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-xl text-ink-600">
        WonderCode helps kids aged 8 to 12 turn their ideas into real apps, and understand the code
        behind them.
      </p>
    </header>
  );
}

function KidsCard() {
  const { start } = useGuest();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function tryAsGuest() {
    setBusy(true);
    setError('');
    const result = await start();
    setBusy(false);
    if (result.ok) navigate('/try');
    else setError(result.message);
  }

  return (
    <Card tone="sun" as="section" aria-labelledby="kids-heading" className="flex flex-col">
      <h2 id="kids-heading" className="text-2xl font-extrabold">
        Ready to create? 🚀
      </h2>
      <p className="mt-2 flex-1 text-sun-800">
        Take a quick tour and see what WonderCode can do. You don't need an account.
      </p>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
      <Button size="lg" className="mt-4" loading={busy} onClick={tryAsGuest}>
        Try as Guest
      </Button>
    </Card>
  );
}

function ParentsCard() {
  const { user } = useAuth();
  return (
    <Card as="section" aria-labelledby="parents-heading" className="flex flex-col">
      <h2 id="parents-heading" className="text-2xl font-extrabold">
        For parents and guardians
      </h2>
      <p className="mt-2 flex-1 text-ink-600">
        Create one account, then add a profile for each child. Your children keep their own projects
        and progress.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {user ? (
          <>
            <Link to="/profiles" className={buttonClasses({ size: 'lg' })}>
              Choose a profile
            </Link>
            <Link to="/parent" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
              Parent area
            </Link>
          </>
        ) : (
          <>
            <Link to="/sign-up" className={buttonClasses({ size: 'lg' })}>
              Create account
            </Link>
            <Link to="/sign-in" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
              Parent sign in
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div className="space-y-16">
      <Hero />

      <div className="grid gap-6 md:grid-cols-2">
        <KidsCard />
        <ParentsCard />
      </div>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-center text-3xl font-extrabold">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.title}>
              <Card tone="brand" className="h-full text-center">
                <span aria-hidden="true" className="text-4xl">
                  {step.icon}
                </span>
                <h3 className="mt-2 text-lg font-extrabold">{step.title}</h3>
                <p className="mt-1 text-ink-600">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="safe-heading" className="rounded-card bg-brand-50 p-6 sm:p-10">
        <h2 id="safe-heading" className="text-3xl font-extrabold">
          Made with parents in mind
        </h2>
        <ul className="mt-4 grid gap-3 text-lg text-ink-700 sm:grid-cols-2">
          <li>👨‍👩‍👧 Parent-managed profiles. Children do not need an email or password.</li>
          <li>🔒 Each child's projects and progress stay separate and private.</li>
          <li>🗣️ Explanations in English, हिंदी and Hinglish.</li>
          <li>🌱 Learning by building: HTML, CSS and JavaScript, one step at a time.</li>
        </ul>
      </section>

      <footer className="pb-4 text-center text-sm text-ink-600">
        WonderCode. Imagine it. Build it. Understand it.
      </footer>
    </div>
  );
}
