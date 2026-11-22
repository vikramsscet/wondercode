import { useLocation } from 'react-router-dom';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';
import { useGuest } from '../features/guest/GuestContext.jsx';
import PromptStudio from '../features/prompt-studio/PromptStudio.jsx';

// Child version: /create (inside the child layout, needs an active child).
export function ChildCreatePage() {
  const { active } = useChildProfiles();
  const { state } = useLocation(); // a dashboard idea card can pre-fill the prompt
  return (
    <PromptStudio
      key={active.id}
      childId={active.id}
      initialPrompt={typeof state?.prompt === 'string' ? state.prompt : ''}
      defaultLanguage={active.explanationLanguage ?? 'en'}
    />
  );
}

// Guest version: /try/create (inside the guest route).
export function GuestCreatePage() {
  const { guest } = useGuest();
  return <PromptStudio guestToken={guest.token} />;
}
