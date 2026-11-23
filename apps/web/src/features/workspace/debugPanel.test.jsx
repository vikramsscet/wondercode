import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugPanel, { applyLines } from './DebugPanel.jsx';
import Workspace from './Workspace.jsx';
import { buildPreview } from './preview/buildPreviewDocument.js';
import { acceptMessage } from './preview/previewProtocol.js';

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } },
}));
vi.mock('./MonacoEditor.jsx', () => ({
  default: ({ path, value, onChange }) => (
    <textarea
      aria-label={`Editor ${path}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
const ok = (data) => reply(200, { success: true, data });
const l = (t) => ({ en: t, hi: `hi ${t}`, hinglish: `hg ${t}` });
const SCRIPT = 'let score = 0;\nfunction add() {\n  scor += 1;\n}\nadd();\n';
const FILES = [
  { path: 'index.html', content: '<h1>Hi</h1><script src="script.js"></script>' },
  { path: 'script.js', content: SCRIPT },
];
const PROBLEM = {
  kind: 'error',
  name: 'ReferenceError',
  message: 'Uncaught ReferenceError: scor is not defined',
  filePath: 'script.js',
  line: 3,
  column: 3,
};
const ANSWER = {
  status: 'ok',
  verified: { ...PROBLEM },
  explanation: l('The computer does not know "scor".'),
  likelyCause: l('There may be a typo.'),
  fix: {
    description: l('Create "scor" first.'),
    filePath: 'script.js',
    lineStart: 3,
    lineEnd: 3,
    before: '  scor += 1;',
    replacement: 'let scor = 0;\n  scor += 1;',
  },
  isMock: true,
};
const DEBUG = { projectId: 'p1', versionId: 'v1', childId: 'c1', defaultLanguage: 'en' };
let calls;
function api(response = () => ok(ANSWER)) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      if (!url.endsWith('/debug')) return ok({ conversationId: null, messages: [] });
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      const r = response();
      if (r instanceof Error) throw r;
      return r;
    }),
  );
}
const panel = (props = {}) => {
  const onApplyFix = vi.fn();
  const run = { problem: PROBLEM, changed: false, status: 'running' };
  render(
    <DebugPanel
      debug={DEBUG}
      run={run}
      files={FILES}
      edited={false}
      onApplyFix={onApplyFix}
      {...props}
    />,
  );
  return { onApplyFix };
};
const ask = () => userEvent.click(screen.getByRole('button', { name: 'Help me understand' }));

beforeEach(() => vi.unstubAllGlobals());

describe('DebugPanel', () => {
  it('shows nothing without a problem, for other problems, or in the sample workspace', () => {
    const { container, rerender } = render(
      <DebugPanel debug={DEBUG} run={{ problem: null }} files={FILES} edited={false} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <DebugPanel
        debug={DEBUG}
        run={{ problem: { kind: 'missing' } }}
        files={FILES}
        edited={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <DebugPanel debug={undefined} run={{ problem: PROBLEM }} files={FILES} edited={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('sends only what the preview reported, never code', async () => {
    api();
    panel();
    await ask();
    await screen.findByText(/What it means/);
    expect(calls[0].url).toMatch(/\/projects\/p1\/debug$/);
    expect(calls[0].headers['X-Child-Id']).toBe('c1');
    expect(calls[0].body).toEqual({
      versionId: 'v1',
      error: {
        kind: 'error',
        name: 'ReferenceError',
        message: PROBLEM.message,
        filePath: 'script.js',
        line: 3,
        column: 3,
      },
      explanationLanguage: 'en',
    });
    expect(JSON.stringify(calls[0].body)).not.toContain('score');
  });

  it('keeps what was checked apart from the guess', async () => {
    api();
    panel();
    await ask();
    const checked = await screen.findByRole('region', { name: 'What the computer told us' });
    expect(checked).toHaveTextContent('(checked)');
    expect(checked).toHaveTextContent('script.js, line 3');
    expect(checked).toHaveTextContent('scor += 1;'); // the line of code, from the saved file
    expect(screen.getByRole('region', { name: 'What it means' })).toHaveTextContent(
      'does not know',
    );
    const guess = screen.getByRole('region', { name: 'My guess' });
    expect(guess).toHaveTextContent('(not checked)');
    expect(guess).toHaveTextContent('There may be a typo.');
    expect(screen.getByLabelText('Code now')).toHaveTextContent('scor += 1;');
    expect(screen.getByLabelText('Code after the fix')).toHaveTextContent('let scor = 0;');
  });

  it('uses the chosen language', async () => {
    api();
    panel();
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hinglish');
    await ask();
    expect(await screen.findByText(/hg There may be a typo\./)).toBeInTheDocument();
    expect(calls[0].body.explanationLanguage).toBe('hinglish');
  });

  it('adds a fix only when asked, as a patched copy of the saved file', async () => {
    api();
    const { onApplyFix } = panel();
    await ask();
    await screen.findByText(/My guess/);
    expect(onApplyFix).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Put this fix in my code' }));
    expect(onApplyFix).toHaveBeenCalledWith(
      'script.js',
      'let score = 0;\nfunction add() {\nlet scor = 0;\n  scor += 1;\n}\nadd();\n',
    );
    expect(screen.getByText(/as a change you haven't saved/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Put this fix in my code' }),
    ).not.toBeInTheDocument();
  });

  it('does not offer a fix that no longer matches the saved code', async () => {
    api(() => ok({ ...ANSWER, fix: { ...ANSWER.fix, before: '  something else;' } }));
    panel();
    await ask();
    expect(await screen.findByText(/That code has changed, so ask me again/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Put this fix in my code' }),
    ).not.toBeInTheDocument();
  });

  it('works without a fix', async () => {
    api(() => ok({ ...ANSWER, fix: undefined }));
    panel();
    await ask();
    await screen.findByText(/My guess/);
    expect(screen.queryByLabelText('Code now')).not.toBeInTheDocument();
  });

  it('asks the child to reset or restart first, and sends nothing', async () => {
    api();
    const { rerender } = render(
      <DebugPanel
        debug={DEBUG}
        run={{ problem: PROBLEM, changed: false }}
        files={FILES}
        edited
        onApplyFix={() => {}}
      />,
    );
    expect(screen.getByText(/Reset your unsaved changes first/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help me understand' })).toBeDisabled();
    rerender(
      <DebugPanel
        debug={DEBUG}
        run={{ problem: PROBLEM, changed: true }}
        files={FILES}
        edited={false}
        onApplyFix={() => {}}
      />,
    );
    expect(screen.getByText(/Press Restart, then ask me again/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help me understand' })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });

  it('shows a calm note for a blocked message, and friendly errors and limits', async () => {
    api(() => ok({ status: 'blocked', message: "I can't read that message." }));
    panel();
    await ask();
    expect(await screen.findByText("I can't read that message.")).toBeInTheDocument();
    expect(screen.queryByText(/My guess/)).not.toBeInTheDocument();

    api(() => new TypeError('network'));
    await ask();
    expect(await screen.findByText(/couldn't look at that just now/)).toBeInTheDocument();

    api(() =>
      reply(429, {
        success: false,
        error: { code: 'DEBUG_LIMIT_REACHED', message: 'Come back tomorrow for more.' },
      }),
    );
    await ask();
    expect(await screen.findByText(/Come back tomorrow/)).toBeInTheDocument();
  });

  it('starts fresh when a new problem appears', async () => {
    api();
    const run1 = { problem: PROBLEM, changed: false };
    const { rerender } = render(
      <DebugPanel debug={DEBUG} run={run1} files={FILES} edited={false} onApplyFix={() => {}} />,
    );
    await ask();
    await screen.findByText(/My guess/);
    rerender(
      <DebugPanel
        debug={DEBUG}
        run={{ problem: { ...PROBLEM, line: 4 }, changed: false }}
        files={FILES}
        edited={false}
        onApplyFix={() => {}}
      />,
    );
    expect(screen.queryByText(/My guess/)).not.toBeInTheDocument();
  });

  it('uses the guest token for guests', async () => {
    api();
    panel({ debug: { projectId: 'p1', versionId: 'v1', guestToken: 'gtok' } });
    await ask();
    await screen.findByText(/My guess/);
    expect(calls[0].headers['X-Guest-Token']).toBe('gtok');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });
});

describe('applyLines', () => {
  it('replaces a line range and keeps the rest', () => {
    expect(applyLines('a\nb\nc\n', 2, 2, 'X\nY')).toBe('a\nX\nY\nc\n');
    expect(applyLines('a\nb\nc', 1, 3, 'Z')).toBe('Z');
  });
});

describe('error line mapping', () => {
  it('finds where the child script sits in the page', () => {
    const { srcDoc, script } = buildPreview(FILES, 'abc');
    expect(script).toMatchObject({ path: 'script.js', lineCount: SCRIPT.split('\n').length });
    const docLines = srcDoc.split('\n');
    // the first line of the script shares its page line with the <script> tag
    expect(docLines[script.startLine - 1].endsWith('<script>let score = 0;')).toBe(true);
    expect(docLines[script.startLine - 1 + 2]).toBe('  scor += 1;');
  });

  it('survives code that contains a closing script tag, and has no mapping without a script', () => {
    const tricky = [FILES[0], { path: 'script.js', content: 'let a = "</script>";\nlet b = 2;\n' }];
    const { srcDoc, script } = buildPreview(tricky, 'abc');
    expect(srcDoc.split('\n')[script.startLine]).toBe('let b = 2;');
    expect(buildPreview([{ path: 'index.html', content: '<h1>x</h1>' }], 'abc').script).toBeNull();
  });

  it('accepts the richer error report and drops bad values', () => {
    const win = {};
    const ev = (d) => ({ source: win, origin: 'null', data: { n: 'n', t: 'error', d } });
    expect(
      acceptMessage(ev({ message: 'm', name: 'TypeError', line: 5, column: 2 }), win, 'n'),
    ).toEqual({
      type: 'error',
      message: 'm',
      name: 'TypeError',
      line: 5,
      column: 2,
    });
    expect(
      acceptMessage(ev({ message: 'm', name: '<b>x', line: -1, column: 1.5 }), win, 'n'),
    ).toEqual({
      type: 'error',
      message: 'm',
    });
  });
});

describe('Workspace + debugging', () => {
  it('shows the helper after a run error and adds the fix as an unsaved edit', async () => {
    api();
    render(<Workspace files={FILES} title="T" explain={DEBUG} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const frame = screen.getByTitle('Project preview');
    const srcdoc = frame.getAttribute('srcdoc');
    const nonce = /var N="([0-9a-f]+)"/.exec(srcdoc)[1];
    const { script } = buildPreview(FILES, nonce);
    const send = (t, d) =>
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { n: nonce, t, d },
            source: frame.contentWindow,
            origin: 'null',
          }),
        );
      });
    await send('ready');
    // the browser reports a line of the whole page; the app turns it into a line of script.js
    await send('error', {
      message: PROBLEM.message,
      name: 'ReferenceError',
      line: script.startLine + 2,
      column: 3,
    });
    expect(screen.getByText(/\(script\.js, line 3\)/)).toBeInTheDocument();

    await ask();
    await screen.findByText(/My guess/);
    expect(calls[0].body.error).toMatchObject({ filePath: 'script.js', line: 3 });
    await userEvent.click(screen.getByRole('button', { name: 'Put this fix in my code' }));
    expect(await screen.findByLabelText('Editor script.js')).toHaveValue(
      'let score = 0;\nfunction add() {\nlet scor = 0;\n  scor += 1;\n}\nadd();\n',
    );
    expect(screen.getByText('Changed, not saved')).toBeInTheDocument();
    // the preview now says the code changed since it ran, so the helper waits for a restart
    expect(screen.getByRole('button', { name: 'Help me understand' })).toBeDisabled();
  });

  it('ignores a reported line that is outside the child’s script', async () => {
    api();
    render(<Workspace files={FILES} title="T" explain={DEBUG} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const frame = screen.getByTitle('Project preview');
    const nonce = /var N="([0-9a-f]+)"/.exec(frame.getAttribute('srcdoc'))[1];
    await act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { n: nonce, t: 'error', d: { message: 'boom', name: 'Error', line: 1 } },
          source: frame.contentWindow,
          origin: 'null',
        }),
      );
    });
    expect(screen.getByText(/Your code hit a problem: boom$/)).toBeInTheDocument();
    await ask();
    await screen.findByText(/What it means/);
    expect(calls[0].body.error).not.toHaveProperty('line');
  });
});
