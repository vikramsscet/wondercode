import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  buttonClasses,
  Spinner,
  TextField,
} from '../../components/ui/index.js';
import { cn } from '../../utils/cn.js';
import { LANGUAGES, PROMPT_MAX, examplePrompts, starterCards } from './promptStudioData.js';
import { usePromptStudio } from './usePromptStudio.js';

// Moves keyboard and screen-reader focus to the heading of each new step.
function StepHeading({ children }) {
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <h2 ref={ref} tabIndex={-1} className="text-2xl font-extrabold text-brand-800 outline-none">
      {children}
    </h2>
  );
}

function LanguageChooser({ value, onChange, label = 'Language' }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-ink-700">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            aria-pressed={value === l.value}
            onClick={() => onChange(l.value)}
            className={cn(
              'min-h-11 rounded-full border-2 px-4 font-bold',
              value === l.value
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-900 hover:bg-ink-100',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function WriteStep({ studio }) {
  const id = useId();
  const tooShort = studio.prompt.trim().length < 3;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!tooShort) studio.submit();
      }}
    >
      <StepHeading>What do you want to create?</StepHeading>
      {studio.notice && (
        <Alert tone="info" className="mt-3">
          {studio.notice}
        </Alert>
      )}
      <label htmlFor={id} className="mt-4 block text-sm font-bold text-ink-700">
        Describe your idea
      </label>
      <textarea
        id={id}
        rows={4}
        maxLength={PROMPT_MAX}
        value={studio.prompt}
        onChange={(e) => studio.setPrompt(e.target.value)}
        placeholder="For example: a game where a cat catches stars"
        aria-describedby={`${id}-count`}
        className="mt-1 w-full rounded-xl border-2 border-ink-200 bg-white p-4 text-lg text-ink-900 placeholder:text-ink-500 hover:border-ink-300"
      />
      <p id={`${id}-count`} className="mt-1 text-sm text-ink-600">
        {studio.prompt.length} / {PROMPT_MAX}
      </p>

      <div className="mt-4">
        <LanguageChooser value={studio.language} onChange={studio.setLanguage} />
      </div>

      <section aria-labelledby={`${id}-starters`} className="mt-6">
        <h3 id={`${id}-starters`} className="text-lg font-extrabold">
          Pick a starter
        </h3>
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {starterCards.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => studio.setPrompt(card.prompt)}
                className="h-full min-h-11 w-full rounded-2xl border-2 border-sun-200 bg-sun-50 p-3 text-center font-bold hover:bg-sun-100"
              >
                <span aria-hidden="true" className="block text-3xl">
                  {card.icon}
                </span>
                {card.title}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${id}-examples`} className="mt-6">
        <h3 id={`${id}-examples`} className="text-lg font-extrabold">
          Or try an example
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {examplePrompts.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => studio.setPrompt(text)}
                className="min-h-11 rounded-full border-2 border-ink-200 bg-white px-4 hover:bg-ink-100"
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Button type="submit" size="lg" className="mt-8" disabled={tooShort}>
        Make my plan
      </Button>
    </form>
  );
}

function ThinkingStep({ message = 'Thinking about your idea…' }) {
  return (
    <div role="status" aria-live="polite" className="py-12 text-center">
      <Spinner label="" />
      <p className="mt-3 text-xl font-bold text-brand-800">{message}</p>
    </div>
  );
}

const SavingStep = () => <ThinkingStep message="Building your project…" />;

function SavedStep({ studio }) {
  const { saved } = studio;
  const inTrial = useLocation().pathname.startsWith('/try');
  return (
    <div>
      <StepHeading>Your project is saved!</StepHeading>
      {studio.isMock && (
        <Badge tone="sun" className="mt-2">
          Sample code
        </Badge>
      )}
      <Card tone="brand" className="mt-4">
        <h3 className="text-2xl font-extrabold">{saved.project.title}</h3>
        <p className="mt-1">We made these files for you:</p>
        <ul className="mt-2 list-disc pl-6">
          {saved.files.map((f) => (
            <li key={f.path}>{f.path}</li>
          ))}
        </ul>
      </Card>
      <Alert tone="success" className="mt-4">
        Checked: your files have no typos and nothing unsafe.{' '}
        {saved.validation?.warnings?.length > 0 &&
          `We have ${saved.validation.warnings.length} tip${saved.validation.warnings.length === 1 ? '' : 's'} to share later. `}
        It has not been run yet.
      </Alert>
      <Link
        to={`${inTrial ? '/try/workspace' : '/workspace'}/${saved.project.id}`}
        className={buttonClasses({ size: 'lg', className: 'mr-3 mt-6' })}
      >
        Open workspace
      </Link>
      <Button className="mt-6" variant="outline" size="lg" onClick={studio.edit}>
        Make another project
      </Button>
    </div>
  );
}

function ClarifyStep({ studio }) {
  const [text, setText] = useState('');
  const question = studio.questions[0];
  const send = (value) => {
    if (value.trim()) studio.answer(value.trim());
  };
  return (
    <div>
      <StepHeading>One more thing…</StepHeading>
      <p className="mt-3 text-xl">{question?.text ?? studio.message}</p>
      {question?.suggestions?.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {question.suggestions.map((s) => (
            <li key={s}>
              <Button variant="secondary" onClick={() => send(`make a ${s}`)}>
                {s}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <TextField
          label="Your answer"
          value={text}
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <Button type="submit" disabled={!text.trim()}>
            Send
          </Button>
          <Button variant="ghost" onClick={studio.edit}>
            Change my idea
          </Button>
        </div>
      </form>
    </div>
  );
}

function BlockedStep({ studio }) {
  return (
    <div>
      <StepHeading>Let's try a different idea</StepHeading>
      <Alert tone="warning" className="mt-4 text-base">
        {studio.message}
      </Alert>
      <Button className="mt-6" onClick={studio.edit}>
        Try a different idea
      </Button>
    </div>
  );
}

function ErrorStep({ studio }) {
  return (
    <div>
      <StepHeading>Oops!</StepHeading>
      <Alert tone="error" className="mt-4">
        {studio.message}
      </Alert>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={studio.retry}>Try again</Button>
        <Button variant="ghost" onClick={studio.edit}>
          Change my idea
        </Button>
      </div>
    </div>
  );
}

const List = ({ items }) => (
  <ul className="mt-2 list-disc space-y-1 pl-6">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

function ReviewStep({ studio }) {
  const { plan } = studio;
  const [lang, setLang] = useState(studio.language);
  return (
    <div>
      <StepHeading>Here is your plan</StepHeading>
      {studio.isMock && (
        <Badge tone="sun" className="mt-2">
          Sample plan
        </Badge>
      )}
      <Card tone="brand" className="mt-4">
        <h3 className="text-2xl font-extrabold">{plan.title}</h3>
        <p className="mt-1 text-lg">{plan.description}</p>
        <p className="mt-3 text-lg font-semibold text-brand-800">{plan.childSummary[lang]}</p>
        <div className="mt-3">
          <LanguageChooser value={lang} onChange={setLang} label="Read this in" />
        </div>
      </Card>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="text-lg font-extrabold">What it can do</h3>
          <List items={plan.features} />
        </Card>
        <Card>
          <h3 className="text-lg font-extrabold">How you use it</h3>
          <List items={plan.interaction.map((i) => i[lang])} />
        </Card>
        <Card>
          <h3 className="text-lg font-extrabold">What will happen</h3>
          <List items={plan.expectedBehaviour.map((i) => i[lang])} />
        </Card>
        <Card>
          <h3 className="text-lg font-extrabold">You will learn</h3>
          <List items={plan.learningConcepts} />
          <p className="mt-3 text-sm text-ink-600">Files: {plan.files.join(', ')}</p>
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={studio.generate}>
          Looks good!
        </Button>
        <Button variant="outline" size="lg" onClick={studio.edit}>
          Change my idea
        </Button>
      </div>
    </div>
  );
}

const STEPS = {
  writing: WriteStep,
  thinking: ThinkingStep,
  saving: SavingStep,
  saved: SavedStep,
  clarifying: ClarifyStep,
  blocked: BlockedStep,
  error: ErrorStep,
  reviewing: ReviewStep,
};

// The child describes an idea; the API checks it and returns a plan to review.
// Props: { childId } for a child profile, or { guestToken } for a guest.
export default function PromptStudio({ childId, guestToken, defaultLanguage, initialPrompt }) {
  const studio = usePromptStudio({ childId, guestToken, defaultLanguage, initialPrompt });
  const Step = STEPS[studio.step];
  return (
    <section aria-labelledby="studio-title" className="mx-auto max-w-3xl">
      <h1 id="studio-title" className="text-4xl font-extrabold text-brand-800">
        Prompt Studio
      </h1>
      <div className="mt-6">
        <Step studio={studio} />
      </div>
    </section>
  );
}
