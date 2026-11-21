import { useState } from 'react';
import { MAX_CHILDREN_PER_PARENT } from '@wondercode/shared';
import { Alert, Button, Card, Dialog, LoadingState } from '../components/ui/index.js';
import Avatar from '../features/child-profile/Avatar.jsx';
import ChildFormDialog from '../features/child-profile/ChildFormDialog.jsx';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';

const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };

// Manage child profiles: add, edit and delete (all backed by the real /children API).
export default function ParentChildrenPage() {
  const { children, loading, error, addChild, updateChild, deleteChild, reload } =
    useChildProfiles();
  const [form, setForm] = useState(null); // null | { child?: Child }
  const [removing, setRemoving] = useState(null); // child pending deletion
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (loading) return <LoadingState message="Loading profiles…" />;
  if (error) {
    return (
      <div>
        <Alert tone="error">{error}</Alert>
        <Button className="mt-4" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  const list = children ?? [];
  const canAdd = list.length < MAX_CHILDREN_PER_PARENT;

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    const result = await deleteChild(removing.id);
    setDeleting(false);
    if (result.ok) setRemoving(null);
    else setDeleteError(result.message);
  }

  return (
    <section aria-labelledby="children-manage-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="children-manage-heading" className="text-2xl font-extrabold">
          Child profiles
        </h2>
        <Button onClick={() => setForm({})} disabled={!canAdd}>
          Add a child
        </Button>
      </div>
      {!canAdd && (
        <Alert className="mt-3">
          You have {MAX_CHILDREN_PER_PARENT} profiles, the most we allow.
        </Alert>
      )}

      {list.length === 0 ? (
        <Card tone="brand" className="mt-4 text-center">
          <p className="text-lg font-bold">No child profiles yet</p>
          <p className="text-ink-600">Add a profile so your child can start creating.</p>
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((child) => (
            <li key={child.id}>
              <Card className="flex flex-wrap items-center gap-4">
                <Avatar avatarKey={child.avatarKey} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold">{child.displayName}</h3>
                  <p className="text-ink-600">
                    Age {child.age} · Explanations in {LANGUAGE_NAMES[child.explanationLanguage]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${child.displayName}`}
                    onClick={() => setForm({ child })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${child.displayName}`}
                    onClick={() => {
                      setDeleteError('');
                      setRemoving(child);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ChildFormDialog
        open={Boolean(form)}
        child={form?.child}
        onClose={() => setForm(null)}
        onSave={form?.child ? (input) => updateChild(form.child.id, input) : addChild}
      />

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={removing ? `Delete ${removing.displayName}'s profile?` : 'Delete profile'}
        closeLabel="Keep profile"
        actions={
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Delete profile
          </Button>
        }
      >
        <p>
          The profile and its learning space will be deleted. This can't be undone from the app.
        </p>
        {deleteError && (
          <Alert tone="error" className="mt-3">
            {deleteError}
          </Alert>
        )}
      </Dialog>
    </section>
  );
}
