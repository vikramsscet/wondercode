import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_CHILDREN_PER_PARENT } from '@wondercode/shared';
import { Alert, Button, Card, LoadingState } from '../components/ui/index.js';
import ChildFormDialog from '../features/child-profile/ChildFormDialog.jsx';
import Avatar from '../features/child-profile/Avatar.jsx';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';

// Shown to a signed-in parent: choose which child is learning. Switching never needs a sign-out.
export default function ProfilePickerPage() {
  const { children, loading, error, select, addChild, reload } = useChildProfiles();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  if (loading) return <LoadingState message="Loading profiles…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Alert tone="error">{error}</Alert>
        <Button className="mt-4" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  const list = children ?? [];
  const canAdd = list.length < MAX_CHILDREN_PER_PARENT;

  function choose(id) {
    select(id);
    navigate('/dashboard');
  }

  return (
    <section className="text-center">
      <h1 className="text-4xl font-extrabold text-brand-800">Who's learning today?</h1>
      <p className="mt-2 text-lg text-ink-600">
        {list.length
          ? 'Pick a profile to start.'
          : 'Create a profile for your child to get started.'}
      </p>

      <ul className="mt-8 flex flex-wrap justify-center gap-5">
        {list.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              onClick={() => choose(child.id)}
              className="group w-40 rounded-card bg-white p-5 shadow-soft transition-transform hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              <Avatar avatarKey={child.avatarKey} size="lg" />
              <span className="mt-3 block text-lg font-extrabold">{child.displayName}</span>
              <span className="text-sm text-ink-600">Age {child.age}</span>
            </button>
          </li>
        ))}
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-full min-h-48 w-40 flex-col items-center justify-center rounded-card border-2 border-dashed border-brand-300 bg-brand-50 p-5 font-bold text-brand-700 hover:bg-brand-100"
            >
              <span aria-hidden="true" className="text-4xl">
                ＋
              </span>
              Add a child
            </button>
          </li>
        )}
      </ul>

      {!canAdd && (
        <Card tone="brand" className="mx-auto mt-6 max-w-md">
          You have {MAX_CHILDREN_PER_PARENT} profiles, the most we allow.
        </Card>
      )}

      <ChildFormDialog open={adding} onClose={() => setAdding(false)} onSave={addChild} />
    </section>
  );
}
