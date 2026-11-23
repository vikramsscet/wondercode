import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherPanel from './TeacherPanel.jsx';
import { parseParts } from './teacherData.js';

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } },
}));

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
const ok = (data) => reply(200, { success: true, data });
const fail = (status, code, message) => reply(status, { success: false, error: { code, message } });
const ANSWER = {
  status: 'ok',
  conversationId: 'conv1',
  answer: 'A variable is a `box` for a value.',
  language: 'en',
  followUps: ['Can you change the number?'],
  isMock: true,
  visual: { title: { en: 'How a variable works' }, steps: [{ en: 'Name it' }, { en: 'Fill it' }] },
};
const FILE = { path: 'script.js', content: 'let a = 1;\nlet b = 2;\nlet c = 3;\n' };
const session = { projectId: 'p1', versionId: 'v1', childId: 'c1', defaultLanguage: 'en' };

// asks: queue of replies for POST /teacher/ask. history: reply for GET /teacher/conversations.
let calls;
let asks;
function api({
  asks: queue = [ok(ANSWER)],
  history = ok({ conversationId: null, messages: [] }),
  del,
} = {}) {
  calls = [];
  asks = [...queue];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method ?? 'GET';
      calls.push({
        url,
        method,
        headers: init.headers,
        body: init.body ? JSON.parse(init.body) : undefined,
      });
      if (method === 'GET') return history;
      if (method === 'DELETE') return del ?? ok({ deleted: true });
      const r = asks.length > 1 ? asks.shift() : asks[0];
      if (r instanceof Error) throw r;
      return r;
    }),
  );
}
const posts = () => calls.filter((c) => c.method === 'POST');
const panel = (props = {}) =>
  render(<TeacherPanel session={session} file={FILE} edited={false} selection={null} {...props} />);
const textbox = () => screen.getByLabelText('Ask the AI teacher', { selector: 'textarea' });
const sel = (over = {}) => ({ path: 'script.js', startLine: 2, endLine: 3, ...over });

beforeEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('TeacherPanel chat', () => {
  it('starts with suggested questions in the chosen language', async () => {
    api();
    panel();
    expect(screen.getByRole('button', { name: 'What can I try next?' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hinglish');
    expect(screen.getByRole('button', { name: 'Ye code kya karta hai?' })).toBeInTheDocument();
  });

  it('sends a suggested question with the project and shows the answer and follow-ups', async () => {
    api();
    panel();
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    expect(await screen.findByText(/for a value/)).toBeInTheDocument();
    expect(screen.getByText('box').tagName).toBe('CODE');
    expect(screen.getByText('Sample answer')).toBeInTheDocument();
    expect(posts()[0].url).toMatch(/\/teacher\/ask$/);
    expect(posts()[0].headers['X-Child-Id']).toBe('c1');
    expect(posts()[0].body).toEqual({
      projectId: 'p1',
      versionId: 'v1',
      question: 'What can I try next?',
      explanationLanguage: 'en',
    });
    expect(screen.getByRole('button', { name: 'Can you change the number?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'What can I try next?' })).not.toBeInTheDocument();
  });

  it('draws the teacher\u2019s picture inside the answer', async () => {
    api();
    panel();
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    const visual = await screen.findByRole('region', { name: 'How a variable works' });
    expect(visual).toHaveTextContent('Fill it');
  });

  it('continues the same conversation on the next question', async () => {
    api();
    panel();
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    await screen.findByText(/for a value/);
    await userEvent.type(textbox(), 'And a function?{Enter}');
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1].body.conversationId).toBe('conv1');
  });

  it('sends with Enter, adds a line with Shift+Enter, and cannot send empty text', async () => {
    api();
    panel();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await userEvent.type(textbox(), 'What is a loop?{Shift>}{Enter}{/Shift}more');
    expect(posts()).toHaveLength(0);
    expect(textbox()).toHaveValue('What is a loop?\nmore');
    expect(textbox()).toHaveAttribute('maxlength', '500');
  });

  it('sends in the chosen language', async () => {
    api({ asks: [ok({ ...ANSWER, language: 'hi' })] });
    panel();
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hi');
    await userEvent.type(textbox(), 'लूप क्या है?{Enter}');
    await screen.findByText(/for a value/);
    expect(posts()[0].body.explanationLanguage).toBe('hi');
  });

  it('shows a calm note when a question is blocked, with no answer badge', async () => {
    api({
      asks: [ok({ status: 'blocked', message: "I can't help with that one.", followUps: [] })],
    });
    panel();
    await userEvent.type(textbox(), 'something unsafe{Enter}');
    expect(await screen.findByText("I can't help with that one.")).toBeInTheDocument();
    expect(screen.queryByText('Sample answer')).not.toBeInTheDocument();
  });

  it('shows a friendly error and retries without repeating the question', async () => {
    api({ asks: [new TypeError('network'), ok(ANSWER)] });
    panel();
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    expect(await screen.findByText(/couldn't answer just now/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/for a value/)).toBeInTheDocument();
    expect(posts()).toHaveLength(2);
    expect(screen.getAllByText('What is a loop?')).toHaveLength(1);
  });

  it('shows the server’s friendly text when the daily limit is reached', async () => {
    api({
      asks: [
        fail(
          429,
          'TEACHER_LIMIT_REACHED',
          "You've asked lots of questions today! Come back tomorrow for more.",
        ),
      ],
    });
    panel();
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    expect(await screen.findByText(/Come back tomorrow/)).toBeInTheDocument();
  });

  it('prevents double sends while waiting', async () => {
    let release;
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init = {}) => {
        if ((init.method ?? 'GET') === 'GET')
          return Promise.resolve(ok({ conversationId: null, messages: [] }));
        return new Promise((r) => (release = () => r(ok(ANSWER))));
      }),
    );
    panel();
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(textbox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    release();
    await screen.findByText(/for a value/);
    expect(fetch.mock.calls.filter(([, i]) => i?.method === 'POST')).toHaveLength(1);
  });

  it('uses the guest token for guests', async () => {
    api();
    panel({
      session: { projectId: 'p1', versionId: 'v1', guestToken: 'gtok', defaultLanguage: 'en' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    await screen.findByText(/for a value/);
    expect(posts()[0].headers['X-Guest-Token']).toBe('gtok');
    expect(posts()[0].headers).not.toHaveProperty('Authorization');
  });

  it('shows answers as text only, never as HTML', async () => {
    api({ asks: [ok({ ...ANSWER, answer: 'Try <img src=x onerror=alert(1)> and <b>bold</b>' })] });
    const { container } = panel();
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    await screen.findByText(/onerror/);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('keeps the conversation out of browser storage', async () => {
    api();
    panel();
    await userEvent.type(textbox(), 'my private question{Enter}');
    await screen.findByText(/for a value/);
    const all = JSON.stringify({ ...window.localStorage, ...window.sessionStorage });
    expect(all).not.toContain('private question');
    expect(all).not.toContain('for a value');
  });
});

describe('TeacherPanel project context', () => {
  it('offers the selected lines and sends only line numbers, never code', async () => {
    api();
    panel({ selection: sel() });
    expect(screen.getByLabelText(/Show the teacher my selected lines/)).toBeChecked();
    expect(screen.getByText(/script\.js, lines 2 to 3/)).toBeInTheDocument();
    await userEvent.type(textbox(), 'What does this do?{Enter}');
    await screen.findByText(/for a value/);
    expect(posts()[0].body.selection).toEqual({ filePath: 'script.js', lineStart: 2, lineEnd: 3 });
    expect(JSON.stringify(posts()[0].body)).not.toContain('let b');
  });

  it('lets the child keep the lines private', async () => {
    api();
    panel({ selection: sel() });
    await userEvent.click(screen.getByLabelText(/Show the teacher my selected lines/));
    await userEvent.type(textbox(), 'What does this do?{Enter}');
    await screen.findByText(/for a value/);
    expect(posts()[0].body).not.toHaveProperty('selection');
  });

  it('does not share lines from another file, and explains why for edited files', async () => {
    api();
    const { rerender } = panel({ selection: sel({ path: 'index.html' }) });
    expect(screen.getByText(/Select some lines in the code/)).toBeInTheDocument();
    rerender(<TeacherPanel session={session} file={FILE} edited selection={sel()} />);
    expect(screen.getByText(/looks at your saved code/)).toBeInTheDocument();
    await userEvent.type(textbox(), 'What does this do?{Enter}');
    await screen.findByText(/for a value/);
    expect(posts()[0].body).not.toHaveProperty('selection');
  });
});

describe('TeacherPanel conversation', () => {
  const history = ok({
    conversationId: 'conv9',
    messages: [
      { role: 'child', text: 'What is a loop?' },
      {
        role: 'teacher',
        text: 'A loop repeats things.',
        isMock: true,
        visual: { title: { en: 'Loop picture' }, steps: [{ en: 'Do it' }, { en: 'Again' }] },
      },
    ],
  });

  it('restores the latest chat after a reload', async () => {
    api({ history });
    panel();
    expect(await screen.findByText('A loop repeats things.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loop picture' })).toBeInTheDocument(); // restored too
    expect(screen.getByText('What is a loop?')).toBeInTheDocument();
    expect(calls[0].url).toMatch(/\/teacher\/conversations\?projectId=p1$/);
    await userEvent.type(textbox(), 'And a function?{Enter}');
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].body.conversationId).toBe('conv9');
  });

  it('survives a failed restore silently', async () => {
    api({ history: fail(500, 'INTERNAL_ERROR', 'x') });
    panel();
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    expect(await screen.findByText(/for a value/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the chat on request, and the next question starts fresh', async () => {
    api({ history });
    panel();
    await screen.findByText('A loop repeats things.');
    await userEvent.click(screen.getByRole('button', { name: 'Clear chat' }));
    await waitFor(() =>
      expect(screen.queryByText('A loop repeats things.')).not.toBeInTheDocument(),
    );
    expect(calls.find((c) => c.method === 'DELETE').url).toMatch(
      /\/teacher\/conversations\/conv9$/,
    );
    expect(screen.queryByRole('button', { name: 'Clear chat' })).not.toBeInTheDocument();
    await userEvent.type(textbox(), 'Hello there?{Enter}');
    await screen.findByText(/for a value/);
    expect(posts()[0].body).not.toHaveProperty('conversationId');
  });
});

describe('parseParts', () => {
  it('splits `code` from text and leaves odd backticks alone', () => {
    expect(parseParts('a `b` c')).toEqual([
      { code: false, text: 'a ' },
      { code: true, text: 'b' },
      { code: false, text: ' c' },
    ]);
    expect(parseParts('one ` tick')).toEqual([{ code: false, text: 'one ` tick' }]);
    expect(parseParts('``')).toEqual([{ code: false, text: '``' }]);
  });
});
