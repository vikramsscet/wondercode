import { createHash } from 'node:crypto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExplainPanel from './ExplainPanel.jsx';
import Workspace from './Workspace.jsx';

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'jwt' } } }),
    },
  },
}));
vi.mock('./MonacoEditor.jsx', () => ({
  default: ({ path, value, onChange, onSelection }) => (
    <div>
      <textarea
        aria-label={`Editor ${path}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button onClick={() => onSelection({ startLine: 2, endLine: 3 })}>select 2-3</button>
    </div>
  ),
}));

const FILE = { path: 'script.js', content: 'let score = 0;\nfunction add() {\n  score += 1;\n}\n' };
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const EXPLAIN = { projectId: 'p1', versionId: 'v1', childId: 'c1', defaultLanguage: 'en' };
const DATA = {
  concept: 'function',
  isMock: true,
  explanation: { en: 'A small recipe.', hi: 'छोटी रेसिपी।', hinglish: 'Chhoti recipe.' },
  realLifeExample: { en: 'A recipe card.', hi: 'रेसिपी कार्ड।', hinglish: 'Recipe card.' },
  tryThis: 'Call it twice.',
};
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
let calls;
function api(response = () => reply(200, { success: true, data: DATA })) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return response();
    }),
  );
}
const sel = (over = {}) => ({ path: 'script.js', startLine: 2, endLine: 3, ...over });
const panel = (props = {}) =>
  render(
    <ExplainPanel explain={EXPLAIN} file={FILE} edited={false} selection={sel()} {...props} />,
  );

beforeEach(() => vi.unstubAllGlobals());

describe('ExplainPanel', () => {
  it('asks to open a saved project in the sample workspace', () => {
    render(<ExplainPanel explain={undefined} file={FILE} edited={false} selection={null} />);
    expect(screen.getByText('Open a saved project to get explanations.')).toBeInTheDocument();
  });

  it('needs a selection in the open file', () => {
    panel({ selection: null });
    expect(screen.getByRole('button', { name: 'Explain these lines' })).toBeDisabled();
    expect(screen.getByText(/Click or select some lines/)).toBeInTheDocument();
  });

  it('ignores a selection that belongs to another file', () => {
    panel({ selection: sel({ path: 'index.html' }) });
    expect(screen.getByRole('button', { name: 'Explain these lines' })).toBeDisabled();
  });

  it('sends the hash of exactly the selected saved lines, then shows the explanation', async () => {
    api();
    panel();
    await userEvent.click(screen.getByRole('button', { name: 'Explain lines 2 to 3' }));
    expect(await screen.findByText('A small recipe.')).toBeInTheDocument();
    expect(screen.getByText('Sample explanation')).toBeInTheDocument();
    expect(screen.getByText('Try this: Call it twice.')).toBeInTheDocument();
    expect(calls[0].url).toMatch(/\/projects\/p1\/explanations$/);
    expect(calls[0].headers['X-Child-Id']).toBe('c1');
    expect(calls[0].body).toEqual({
      versionId: 'v1',
      filePath: 'script.js',
      lineStart: 2,
      lineEnd: 3,
      codeHash: sha('function add() {\n  score += 1;'),
      explanationLanguage: 'en',
    });
    expect(JSON.stringify(calls[0].body)).not.toContain('score');
  });

  it('uses the chosen language and clears the old answer when it changes', async () => {
    api();
    panel();
    await userEvent.click(screen.getByRole('button', { name: /Explain lines/ }));
    await screen.findByText('A small recipe.');
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hinglish');
    expect(screen.queryByText('A small recipe.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Explain lines/ }));
    expect(await screen.findByText('Chhoti recipe.')).toBeInTheDocument();
    expect(calls[1].body.explanationLanguage).toBe('hinglish');
  });

  it('explains saved code only: edited files are blocked and nothing is sent', async () => {
    api();
    panel({ edited: true });
    expect(screen.getByRole('button', { name: 'Explain these lines' })).toBeDisabled();
    expect(screen.getByText(/Reset your changes to this file first/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('shows friendly messages for stale code and other errors', async () => {
    api(() =>
      reply(409, { success: false, error: { code: 'EXPLANATION_STALE', message: 'server text' } }),
    );
    panel();
    await userEvent.click(screen.getByRole('button', { name: /Explain lines/ }));
    expect(await screen.findByText(/This code has changed/)).toBeInTheDocument();

    api(() => reply(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'boom' } }));
    await userEvent.click(screen.getByRole('button', { name: /Explain lines/ }));
    expect(await screen.findByText(/couldn't explain that just now/)).toBeInTheDocument();
  });

  it('uses the guest token for guests', async () => {
    api();
    panel({ explain: { ...EXPLAIN, childId: undefined, guestToken: 'gtok' } });
    await userEvent.click(screen.getByRole('button', { name: /Explain lines/ }));
    await screen.findByText('A small recipe.');
    expect(calls[0].headers['X-Guest-Token']).toBe('gtok');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });
});

describe('Workspace + explanations', () => {
  const files = [FILE, { path: 'index.html', content: '<h1>Hi</h1>' }];

  it('explains lines picked in the editor, and blocks it once the file is edited', async () => {
    api();
    render(<Workspace files={files} title="T" explain={EXPLAIN} />);
    await userEvent.click(await screen.findByRole('button', { name: 'select 2-3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Explain lines 2 to 3' }));
    expect(await screen.findByText('A small recipe.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Editor script.js'), 'x');
    expect(screen.getByRole('button', { name: /Explain/ })).toBeDisabled();
    expect(screen.getByText(/Reset your changes to this file first/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset this file' }));
    expect(screen.getByRole('button', { name: 'Explain lines 2 to 3' })).toBeEnabled();
  });
});
