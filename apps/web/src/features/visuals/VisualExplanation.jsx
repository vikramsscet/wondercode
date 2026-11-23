import { parseVisual } from './parseVisual.js';

const WORDS = {
  en: {
    start: 'Start',
    step: 'Step',
    decision: 'Question',
    end: 'End',
    then: 'Then',
    yes: 'Yes',
    no: 'No',
    goTo: (n) => `go to step ${n}`,
    input: 'Input',
    output: 'Output',
    examples: 'Examples',
    steps: 'Steps',
    flow: 'Flow',
  },
  hi: {
    start: 'शुरू',
    step: 'स्टेप',
    decision: 'सवाल',
    end: 'अंत',
    then: 'फिर',
    yes: 'हाँ',
    no: 'नहीं',
    goTo: (n) => `स्टेप ${n} पर जाओ`,
    input: 'इनपुट',
    output: 'आउटपुट',
    examples: 'उदाहरण',
    steps: 'स्टेप',
    flow: 'क्रम',
  },
  hinglish: {
    start: 'Shuru',
    step: 'Step',
    decision: 'Sawaal',
    end: 'End',
    then: 'Phir',
    yes: 'Haan',
    no: 'Nahi',
    goTo: (n) => `step ${n} par jao`,
    input: 'Input',
    output: 'Output',
    examples: 'Examples',
    steps: 'Steps',
    flow: 'Flow',
  },
};
const KIND_STYLE = {
  start: 'border-mint-600 bg-mint-100',
  step: 'border-brand-300 bg-brand-50',
  decision: 'border-sun-500 bg-sun-100',
  end: 'border-ink-300 bg-ink-100',
};

// Draws a validated visual (steps, flow, input/output examples) with plain HTML elements.
// Nothing here can run code: all text is shown as text, and unknown data is ignored.
export default function VisualExplanation({ visual, language = 'en' }) {
  const v = parseVisual(visual);
  if (!v) return null;
  const w = WORDS[language] ?? WORDS.en;
  const t = (loc) => loc[language] ?? loc.en;
  const nodes = v.flow?.nodes ?? [];
  const num = (id) => nodes.findIndex((n) => n.id === id) + 1;
  const nextText = (n, i) => (num(n) === i + 2 ? w.then : `${w.then}: ${w.goTo(num(n))}`);

  return (
    <section
      aria-label={t(v.title)}
      className="mt-3 rounded-2xl border-2 border-brand-100 bg-white p-4"
    >
      <h4 className="text-lg font-extrabold text-brand-800">{t(v.title)}</h4>

      {v.steps && (
        <div className="mt-2">
          <h5 className="text-sm font-bold text-ink-600">{w.steps}</h5>
          <ol className="mt-1 list-decimal space-y-1 pl-6">
            {v.steps.map((s, i) => (
              <li key={i}>{t(s)}</li>
            ))}
          </ol>
        </div>
      )}

      {v.flow && (
        <div className="mt-3">
          <h5 className="text-sm font-bold text-ink-600">{w.flow}</h5>
          <ol className="mt-1 space-y-1">
            {nodes.map((n, i) => (
              <li key={n.id}>
                <div className={`rounded-xl border-2 px-3 py-2 ${KIND_STYLE[n.kind]}`}>
                  <span className="mr-2 text-xs font-extrabold uppercase tracking-wide text-ink-700">
                    {i + 1}. {w[n.kind]}
                  </span>
                  <span className="font-semibold">{t(n.text)}</span>
                </div>
                {n.kind === 'decision' ? (
                  <ul className="ml-4 mt-1 space-y-0.5 text-sm font-semibold text-ink-700">
                    <li>
                      <span aria-hidden="true">↳ </span>
                      {w.yes}: {w.goTo(num(n.yes))}
                    </li>
                    <li>
                      <span aria-hidden="true">↳ </span>
                      {w.no}: {w.goTo(num(n.no))}
                    </li>
                  </ul>
                ) : (
                  n.next && (
                    <p className="ml-4 mt-0.5 text-sm font-semibold text-ink-700">
                      <span aria-hidden="true">↓ </span>
                      {nextText(n.next, i)}
                    </p>
                  )
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {v.examples && (
        <table className="mt-3 w-full text-left text-sm">
          <caption className="pb-1 text-left text-sm font-bold text-ink-600">{w.examples}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b-2 border-ink-200 py-1 pr-3">
                {w.input}
              </th>
              <th scope="col" className="border-b-2 border-ink-200 py-1">
                {w.output}
              </th>
            </tr>
          </thead>
          <tbody>
            {v.examples.map((e, i) => (
              <tr key={i}>
                <td className="border-b border-ink-100 py-1 pr-3 font-mono">{e.input}</td>
                <td className="border-b border-ink-100 py-1 font-mono">{e.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
