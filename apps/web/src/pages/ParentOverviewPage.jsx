import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, LoadingState, buttonClasses } from '../components/ui/index.js';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';
import { apiRequest } from '../services/apiClient.js';

export default function ParentOverviewPage() {
  const { children } = useChildProfiles();
  const [parent, setParent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/auth/me')
      .then((data) => active && setParent(data))
      .catch(() => active && setError('We could not load your account. Please try again.'));
    return () => {
      active = false;
    };
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!parent) return <LoadingState message="Loading your account…" />;

  const count = children?.length;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card as="section" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-2xl font-extrabold">
          Your account
        </h2>
        <p className="mt-3 text-lg">
          <strong>{parent.displayName || 'Parent'}</strong>
        </p>
        <p className="text-ink-600">{parent.email}</p>
      </Card>
      <Card tone="brand" as="section" aria-labelledby="children-heading">
        <h2 id="children-heading" className="text-2xl font-extrabold">
          Child profiles
        </h2>
        <p className="mt-3 text-lg">
          {count === undefined
            ? 'Loading…'
            : count === 0
              ? 'No profiles yet.'
              : `${count} ${count === 1 ? 'profile' : 'profiles'}`}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/parent/children" className={buttonClasses({ size: 'sm' })}>
            Manage children
          </Link>
          <Link to="/profiles" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
            Open a child's space
          </Link>
        </div>
      </Card>
    </div>
  );
}
