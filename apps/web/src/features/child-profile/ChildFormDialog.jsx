import { useState } from 'react';
import { AGE_MAX, AGE_MIN, EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { Alert, Button, Dialog, SelectField, TextField } from '../../components/ui/index.js';
import { cn } from '../../utils/cn.js';
import { avatars } from './avatars.js';

const LANGUAGE_NAMES = { en: 'English', hi: 'हिंदी (Hindi)', hinglish: 'Hinglish' };
const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

// The form mounts only while the dialog is open, so every opening starts from fresh values.
function ChildForm({ child, onClose, onSave }) {
  const [avatarKey, setAvatarKey] = useState(child?.avatarKey ?? avatars[0].key);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const result = await onSave({
      displayName: String(form.get('displayName')).trim(),
      age: Number(form.get('age')),
      avatarKey,
      explanationLanguage: String(form.get('explanationLanguage')),
    });
    setBusy(false);
    if (result.ok) onClose();
    else setError(result.message);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField
        label="Nickname"
        name="displayName"
        required
        maxLength={30}
        defaultValue={child?.displayName}
        hint="A nickname is fine. No full names needed."
      />
      <SelectField label="Age" name="age" defaultValue={String(child?.age ?? 9)}>
        {ages.map((age) => (
          <option key={age} value={age}>
            {age}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Explanations in"
        name="explanationLanguage"
        defaultValue={child?.explanationLanguage ?? 'en'}
      >
        {EXPLANATION_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_NAMES[lang]}
          </option>
        ))}
      </SelectField>
      <fieldset>
        <legend className="text-sm font-bold text-ink-700">Pick an avatar</legend>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {avatars.map((avatar) => (
            <label key={avatar.key} className="cursor-pointer">
              <input
                type="radio"
                name="avatar"
                value={avatar.key}
                checked={avatarKey === avatar.key}
                onChange={() => setAvatarKey(avatar.key)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex size-12 items-center justify-center rounded-full text-2xl ring-offset-2 peer-checked:ring-4 peer-checked:ring-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-400',
                  avatar.background,
                )}
              >
                <span aria-hidden="true">{avatar.emoji}</span>
                <span className="sr-only">{avatar.label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={busy} className="w-full">
        Save profile
      </Button>
    </form>
  );
}

// Add (no `child`) or edit (with `child`) a child profile.
export default function ChildFormDialog({ open, child, onClose, onSave }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={child ? `Edit ${child.displayName}'s profile` : 'Add a child profile'}
      closeLabel="Cancel"
    >
      {open && (
        <ChildForm key={child?.id ?? 'new'} child={child} onClose={onClose} onSave={onSave} />
      )}
    </Dialog>
  );
}
