import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, buttonClasses } from '../components/ui/index.js';
import { useGuest } from '../features/guest/GuestContext.jsx';

const minutesLeft = (expiresAt) =>
  Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 60000));

// Placeholder guest area. Creation features arrive in later prompts.
export default function GuestHomePage() {
  const { guest, end } = useGuest();
  const [minutes, setMinutes] = useState(() => minutesLeft(guest.expiresAt));

  useEffect(() => {
    const timer = setInterval(() => setMinutes(minutesLeft(guest.expiresAt)), 30000);
    return () => clearInterval(timer);
  }, [guest.expiresAt]);

  return (
    <section className="mx-auto max-w-xl text-center">
      <Badge tone="sun">Guest visit</Badge>
      <h1 className="mt-3 text-4xl font-extrabold text-brand-800">Welcome, explorer!</h1>
      <p className="mt-3 text-lg text-ink-600">
        You can look around for about {minutes} more {minutes === 1 ? 'minute' : 'minutes'}. Guest
        visits are short and do not keep your work.
      </p>
      <Link to="/try/create" className={buttonClasses({ size: 'lg', className: 'mt-6' })}>
        Start creating
      </Link>
      <Alert tone="info" className="mt-6">
        Building your project from the plan is coming soon!
      </Alert>
      <Card tone="sun" className="mt-6 text-left">
        <h2 className="text-lg font-extrabold">Want to save your projects?</h2>
        <p className="mt-1 text-sun-800">
          Ask a parent or guardian to create a WonderCode account. They can set up a profile just
          for you.
        </p>
        <Link
          to="/sign-up"
          className={buttonClasses({ variant: 'outline', size: 'sm', className: 'mt-3' })}
        >
          For parents: create an account
        </Link>
      </Card>
      <Button variant="ghost" className="mt-6" onClick={end}>
        End my visit
      </Button>
    </section>
  );
}
