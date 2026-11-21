import { Alert, Card } from '../components/ui/index.js';
import ComingSoon from '../features/parent-dashboard/ComingSoon.jsx';

// Sections below are shells. They are connected to real data in Prompt 36 (and the prompts it depends on).

export const ParentProjectsPage = () => (
  <ComingSoon
    title="Projects"
    icon="📂"
    willShow={['Each child’s saved projects', 'When they were last worked on']}
  >
    You will see what your children have built here.
  </ComingSoon>
);

export const ParentProgressPage = () => (
  <ComingSoon
    title="Progress"
    icon="🌱"
    willShow={['Concepts your child has shown they understand', 'Challenges tried and completed']}
  >
    Learning progress is based on what children actually demonstrate, not just on how much they use
    the app.
  </ComingSoon>
);

export const ParentUsagePage = () => (
  <ComingSoon
    title="Usage"
    icon="⏱️"
    willShow={['How much each child has used AI help', 'Daily limits you can set']}
  >
    Usage summaries and limits will appear here.
  </ComingSoon>
);

const stored = ['Nickname', 'Age (8 to 12)', 'Avatar', 'Preferred language for explanations'];

export function ParentPrivacyPage() {
  return (
    <div className="space-y-6">
      <Card as="section" aria-labelledby="stored-heading">
        <h2 id="stored-heading" className="text-2xl font-extrabold">
          What we keep about each child
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-700">
          {stored.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-ink-600">
          We do not ask for a child’s email, phone number, photo or full name. You can edit or
          delete a profile from the Children tab at any time.
        </p>
      </Card>
      <ComingSoon
        title="Consent and data controls"
        icon="🔒"
        willShow={[
          'Consent records',
          'Download your child’s data',
          'Full account and data deletion requests',
        ]}
      >
        More privacy controls are on the way.
      </ComingSoon>
      <Alert tone="info">
        Questions about your child’s privacy? Privacy information will be added here before
        WonderCode opens to the public.
      </Alert>
    </div>
  );
}
