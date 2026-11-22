import { Link } from 'react-router-dom';
import { Badge, Card, buttonClasses } from '../components/ui/index.js';
import Avatar from '../features/child-profile/Avatar.jsx';
import { useChildProfiles } from '../features/child-profile/ChildProfilesContext.jsx';
import { journeyStages, sampleChallenges, starterIdeas } from '../features/dashboard/mockData.js';

const Section = ({ id, title, preview, children }) => (
  <section aria-labelledby={id} className="mt-12">
    <div className="flex flex-wrap items-center gap-3">
      <h2 id={id} className="text-2xl font-extrabold">
        {title}
      </h2>
      {preview && <Badge tone="sun">Preview</Badge>}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

// Child dashboard. Starter ideas, journey and challenges use temporary sample data (see mockData.js);
// the actions they lead to arrive in later prompts, so they are shown as "coming soon".
export default function DashboardPage() {
  const { active } = useChildProfiles();
  return (
    <div>
      <header className="flex flex-wrap items-center gap-5">
        <Avatar avatarKey={active.avatarKey} size="lg" />
        <div>
          <h1 className="text-4xl font-extrabold text-brand-800">Hi, {active.displayName}! 👋</h1>
          <p className="mt-1 text-xl text-ink-600">What do you want to create today?</p>
        </div>
      </header>

      <Section id="ideas-heading" title="Start with an idea">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {starterIdeas.map((idea) => (
            <li key={idea.id}>
              <Card tone="sun" className="h-full">
                <span aria-hidden="true" className="text-4xl">
                  {idea.icon}
                </span>
                <h3 className="mt-2 text-lg font-extrabold">{idea.title}</h3>
                <p className="text-sun-800">{idea.text}</p>
                <Link
                  to="/create"
                  state={{ prompt: idea.text }}
                  className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-3' })}
                >
                  Start this idea
                </Link>
              </Card>
            </li>
          ))}
        </ul>
        <Link to="/create" className={buttonClasses({ size: 'lg', className: 'mt-5' })}>
          Create something new
        </Link>
      </Section>

      <Section id="projects-heading" title="My projects">
        <Card tone="brand" className="text-center">
          <p aria-hidden="true" className="text-5xl">
            📂
          </p>
          <p className="mt-2 text-lg font-bold">No projects yet</p>
          <p className="text-ink-600">The things you build will show up here.</p>
        </Card>
      </Section>

      <Section id="journey-heading" title="My Coding Journey" preview>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {journeyStages.map((stage, index) => (
            <li key={stage.id}>
              <Card className="h-full text-center" aria-current={index === 0 ? 'step' : undefined}>
                <span aria-hidden="true" className="text-3xl">
                  {stage.icon}
                </span>
                <h3 className="mt-1 font-extrabold">{stage.title}</h3>
                <p className="text-sm text-ink-600">{stage.text}</p>
                {index === 0 && (
                  <Badge tone="mint" className="mt-2">
                    Start here
                  </Badge>
                )}
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="challenges-heading" title="Challenges" preview>
        <ul className="grid gap-4 sm:grid-cols-3">
          {sampleChallenges.map((challenge) => (
            <li key={challenge.id}>
              <Card className="h-full">
                <h3 className="text-lg font-extrabold">{challenge.title}</h3>
                <p className="mt-1 text-ink-600">
                  {challenge.language} · Level {challenge.level}
                </p>
                <Badge tone="brand" className="mt-3">
                  Coming soon
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
