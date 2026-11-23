import { render, screen, within } from '@testing-library/react';
import VisualExplanation from './VisualExplanation.jsx';
import { parseVisual } from './parseVisual.js';

const l = (en, hi = `hi ${en}`, hinglish = `hg ${en}`) => ({ en, hi, hinglish });
const FLOW = {
  title: l('A choice'),
  flow: {
    nodes: [
      { id: 'ask', kind: 'decision', text: l('Is it right?'), yes: 'win', no: 'again' },
      { id: 'win', kind: 'step', text: l('Add a point'), next: 'end' },
      { id: 'again', kind: 'step', text: l('Try again'), next: 'ask' },
      { id: 'end', kind: 'end', text: l('Done') },
    ],
  },
  steps: [l('First'), l('Second')],
  examples: [{ input: 'score = 0', output: 'shows 0' }],
};

describe('parseVisual', () => {
  it('keeps a valid visual and drops unknown fields', () => {
    const v = parseVisual({ ...FLOW, html: '<b>x</b>', steps: [l('a'), { ...l('b'), extra: 1 }] });
    expect(v).not.toHaveProperty('html');
    expect(v.steps[1]).toEqual({ en: 'b', hi: 'hi b', hinglish: 'hg b' });
  });

  it('returns null for junk, nothing to show, or a missing title', () => {
    for (const bad of [null, 'x', 42, [], {}, { title: l('t') }, { steps: [l('a'), l('b')] }]) {
      expect(parseVisual(bad)).toBeNull();
    }
  });

  it('drops a single step, bad examples, and clamps long text', () => {
    const v = parseVisual({
      title: l('x'.repeat(200)),
      steps: [l('only one')],
      examples: [
        { input: 'a', output: '' },
        { input: 'b'.repeat(100), output: 'c' },
      ],
    });
    expect(v.title.en).toHaveLength(80);
    expect(v).not.toHaveProperty('steps');
    expect(v.examples).toEqual([{ input: 'b'.repeat(60), output: 'c' }]);
  });

  it('drops a broken flow but keeps the other parts', () => {
    const base = { title: l('t'), steps: [l('a'), l('b')] };
    const dangling = {
      nodes: [
        { id: 'a', kind: 'start', text: l('A'), next: 'zzz' },
        { id: 'b', kind: 'end', text: l('B') },
      ],
    };
    const noNo = {
      nodes: [
        { id: 'a', kind: 'decision', text: l('?'), yes: 'b' },
        { id: 'b', kind: 'end', text: l('B') },
      ],
    };
    const dupes = {
      nodes: [
        { id: 'a', kind: 'step', text: l('A') },
        { id: 'a', kind: 'end', text: l('B') },
      ],
    };
    const badKind = {
      nodes: [
        { id: 'a', kind: 'script', text: l('A') },
        { id: 'b', kind: 'end', text: l('B') },
      ],
    };
    for (const flow of [dangling, noNo, dupes, badKind, { nodes: [] }, 'x']) {
      const v = parseVisual({ ...base, flow });
      expect(v.flow).toBeUndefined();
      expect(v.steps).toHaveLength(2);
    }
  });

  it('falls back to English when another language is missing', () => {
    const v = parseVisual({ title: { en: 'Only English' }, steps: [{ en: 'a' }, { en: 'b' }] });
    expect(v.title).toEqual({ en: 'Only English' });
  });
});

describe('VisualExplanation', () => {
  it('draws steps, a flow with yes/no and loops, and an examples table', () => {
    render(<VisualExplanation visual={FLOW} language="en" />);
    const region = screen.getByRole('region', { name: 'A choice' });
    expect(within(region).getByRole('heading', { name: 'A choice' })).toBeInTheDocument();
    const lists = within(region).getAllByRole('list');
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(within(region).getByText('First')).toBeInTheDocument();
    // flow: kinds are written out (not only coloured), numbered, and decisions point both ways
    expect(within(region).getByText('1. Question')).toBeInTheDocument();
    expect(within(region).getByText('4. End')).toBeInTheDocument();
    expect(within(region).getByText(/Yes: go to step 2/)).toBeInTheDocument();
    expect(within(region).getByText(/No: go to step 3/)).toBeInTheDocument();
    expect(within(region).getByText(/Then: go to step 1/)).toBeInTheDocument(); // the loop back
    expect(within(region).getByText(/Then: go to step 4/)).toBeInTheDocument(); // a jump ahead
    const table = within(region).getByRole('table', { name: 'Examples' });
    expect(within(table).getByText('score = 0')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Output' })).toBeInTheDocument();
  });

  it('says just "Then" when the next box is the one below', () => {
    const linear = {
      title: l('Line'),
      flow: {
        nodes: [
          { id: 'a', kind: 'start', text: l('A'), next: 'b' },
          { id: 'b', kind: 'end', text: l('B') },
        ],
      },
    };
    render(<VisualExplanation visual={linear} />);
    expect(screen.getByText(/^Then$/)).toBeInTheDocument();
  });

  it.each([
    ['hi', 'hi A choice', /हाँ: स्टेप 2 पर जाओ/],
    ['hinglish', 'hg A choice', /Haan: step 2 par jao/],
  ])('uses %s text and labels', (language, title, yes) => {
    render(<VisualExplanation visual={FLOW} language={language} />);
    expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
    expect(screen.getByText(yes)).toBeInTheDocument();
  });

  it('shows only text for HTML-looking content and creates no elements from it', () => {
    const evil = {
      title: l('<img src=x onerror=alert(1)>'),
      steps: [l('<script>alert(1)</script>'), l('<b>bold</b>')],
    };
    const { container } = render(<VisualExplanation visual={evil} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('img, script, b, svg, iframe')).toBeNull();
  });

  it('renders nothing for unusable data', () => {
    const { container } = render(<VisualExplanation visual={{ title: 'x' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
