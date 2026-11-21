import { Badge, Card } from '../../components/ui/index.js';

// Honest placeholder for dashboard sections whose data is not available yet.
// No numbers or sample data are shown here on purpose: parents should only ever see real information.
export default function ComingSoon({ title, icon, children, willShow }) {
  return (
    <Card as="section" aria-labelledby={`${title}-heading`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`${title}-heading`} className="text-2xl font-extrabold">
          {title}
        </h2>
        <Badge tone="sun">Coming soon</Badge>
      </div>
      <p aria-hidden="true" className="mt-4 text-5xl">
        {icon}
      </p>
      <p className="mt-2 text-ink-700">{children}</p>
      {willShow && (
        <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-600">
          {willShow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
