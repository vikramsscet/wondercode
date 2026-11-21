import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  LoadingState,
  Skeleton,
  Spinner,
  TextField,
} from '../components/ui/index.js';

const swatches = {
  brand: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  ink: [50, 100, 200, 300, 500, 600, 700, 900],
  sun: [100, 400, 500, 800],
  mint: [100, 500, 700],
  coral: [100, 500, 600, 700],
};

const Section = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="mb-3 text-xl font-extrabold text-brand-800">{title}</h2>
    {children}
  </section>
);

// Development-only style guide (route is not registered in production builds).
export default function DesignSystemPage() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <h1 className="text-4xl font-extrabold text-brand-800">Design system</h1>
      <p className="mt-2 text-ink-600">Playful, modern and accessible. Development preview only.</p>

      <Section title="Colours">
        <div className="space-y-2">
          {Object.entries(swatches).map(([name, steps]) => (
            <div key={name} className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-sm font-bold">{name}</span>
              {steps.map((step) => (
                <span
                  key={step}
                  title={`${name}-${step}`}
                  style={{ backgroundColor: `var(--color-${name}-${step})` }}
                  className="size-9 rounded-lg border border-ink-200"
                />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Card>
          <p className="text-4xl font-extrabold">Imagine it. Build it. Understand it.</p>
          <p className="mt-2 text-2xl font-bold">Heading two looks like this</p>
          <p className="mt-2">Body text is big and friendly so it is easy to read.</p>
          <p className="mt-2 text-ink-600">हिंदी में भी साफ़ और सुंदर दिखता है: मैं अपना पहला गेम बनाऊँगा।</p>
          <p className="mt-2 font-mono text-sm">const score = 0; // code looks like this</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <h3 className="font-extrabold">White card</h3>
            <p className="text-ink-600">For most content.</p>
          </Card>
          <Card tone="brand">
            <h3 className="font-extrabold">Brand card</h3>
            <p className="text-ink-600">For highlights.</p>
          </Card>
          <Card tone="sun">
            <h3 className="font-extrabold">Sun card</h3>
            <p className="text-sun-800">For tips and ideas.</p>
          </Card>
        </div>
      </Section>

      <Section title="Forms">
        <Card className="max-w-sm space-y-4">
          <TextField label="Nickname" name="nick" hint="Pick any fun name." />
          <TextField
            label="Email"
            name="mail"
            type="email"
            defaultValue="oops"
            error="That doesn't look like an email."
          />
        </Card>
      </Section>

      <Section title="Alerts and badges">
        <div className="space-y-2">
          <Alert>Info: here is something helpful.</Alert>
          <Alert tone="success">Success: your project was saved.</Alert>
          <Alert tone="warning">Warning: this will replace your code.</Alert>
          <Alert tone="error">Error: that did not work. Let's try again.</Alert>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Brand</Badge>
          <Badge tone="sun">Sample response</Badge>
          <Badge tone="mint">Done</Badge>
          <Badge tone="coral">New</Badge>
        </div>
      </Section>

      <Section title="Loading states">
        <div className="flex flex-wrap items-center gap-6">
          <Spinner label="Loading" className="text-brand-600" />
          <div className="w-64 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <LoadingState />
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Ready to build?">
          <p>Dialogs trap focus, close with the Esc key, and return focus to the button.</p>
        </Dialog>
      </Section>
    </div>
  );
}
