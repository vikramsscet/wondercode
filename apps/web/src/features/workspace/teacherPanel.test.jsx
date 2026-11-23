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
const ANSWER = {
  status: 'ok',
  answer: 'A variable is a `box` for a value.',
  language: 'en',
  followUps: ['Can you change the number?'],
  isMock: true,
};
let calls;
let replies;
function api(...queue) {
  calls = [];
  replies = [...queue];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      const r = replies.length > 1 ? replies.shift() : replies[0];
      if (r instanceof Error) throw r;
      return r;
    }),
  );
}
const session = { childId: 'c1', defaultLanguage: 'en' };
const textbox = () => screen.getByLabelText('Ask the AI teacher', { selector: 'textarea' });

beforeEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('TeacherPanel', () => {
  it('starts with suggested questions in the chosen language', async () => {
    render(<TeacherPanel session={session} />);
    expect(screen.getByRole('button', { name: 'What can I try next?' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hinglish');
    expect(screen.getByRole('button', { name: 'Ye code kya karta hai?' })).toBeInTheDocument();
  });

  it('sends a suggested question and shows the answer with follow-up chips', async () => {
    api(ok(ANSWER));
    render(<TeacherPanel session={session} />);
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    const log = screen.getByRole('log', { name: 'Conversation with the AI teacher' });
    expect(await screen.findByText(/for a value/)).toBeInTheDocument();
    expect(log).toHaveTextContent('What can I try next?');
    expect(screen.getByText('box').tagName).toBe('CODE');
    expect(screen.getByText('Sample answer')).toBeInTheDocument();
    expect(calls[0].url).toMatch(/\/teacher\/ask$/);
    expect(calls[0].headers['X-Child-Id']).toBe('c1');
    expect(calls[0].body).toEqual({ question: 'What can I try next?', explanationLanguage: 'en' });
    // follow-ups replace the starter chips
    expect(screen.getByRole('button', { name: 'Can you change the number?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'What can I try next?' })).not.toBeInTheDocument();
  });

  it('sends typed questions with Enter, and Shift+Enter adds a new line instead', async () => {
    api(ok(ANSWER));
    render(<TeacherPanel session={session} />);
    await userEvent.type(textbox(), 'What is a loop?{Shift>}{Enter}{/Shift}more');
    expect(calls).toHaveLength(0);
    expect(textbox()).toHaveValue('What is a loop?\nmore');
    await userEvent.clear(textbox());
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    await screen.findByText(/for a value/);
    expect(calls[0].body.question).toBe('What is a loop?');
    expect(textbox()).toHaveValue('');
  });

  it('does not send empty questions, and limits the length', async () => {
    api(ok(ANSWER));
    render(<TeacherPanel session={session} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await userEvent.type(textbox(), '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(textbox()).toHaveAttribute('maxlength', '500');
    expect(calls).toHaveLength(0);
  });

  it('sends in the chosen language', async () => {
    api(ok({ ...ANSWER, language: 'hi' }));
    render(<TeacherPanel session={session} />);
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hi');
    await userEvent.type(textbox(), 'लूप क्या है?{Enter}');
    await screen.findByText(/for a value/);
    expect(calls[0].body.explanationLanguage).toBe('hi');
  });

  it('shows a calm note when a question is blocked or too short, with no AI answer', async () => {
    api(ok({ status: 'blocked', message: "I can't help with that one.", followUps: [] }));
    render(<TeacherPanel session={session} />);
    await userEvent.type(textbox(), 'something unsafe{Enter}');
    expect(await screen.findByText("I can't help with that one.")).toBeInTheDocument();
    expect(screen.queryByText('Sample answer')).not.toBeInTheDocument();
  });

  it('shows a friendly error and can retry without repeating the question', async () => {
    api(new TypeError('network'), ok(ANSWER));
    render(<TeacherPanel session={session} />);
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    expect(await screen.findByText(/couldn't answer just now/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/for a value/)).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    expect(screen.getAllByText('What is a loop?')).toHaveLength(1);
  });

  it('prevents double sends while waiting', async () => {
    let release;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((r) => (release = () => r(ok(ANSWER))))),
    );
    render(<TeacherPanel session={session} />);
    await userEvent.type(textbox(), 'What is a loop?{Enter}');
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(textbox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    release();
    await screen.findByText(/for a value/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the guest token for guests', async () => {
    api(ok(ANSWER));
    render(<TeacherPanel session={{ guestToken: 'gtok', defaultLanguage: 'en' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    await screen.findByText(/for a value/);
    expect(calls[0].headers['X-Guest-Token']).toBe('gtok');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });

  it('shows answers as text only, never as HTML', async () => {
    api(ok({ ...ANSWER, answer: 'Try <img src=x onerror=alert(1)> and <b>bold</b>' }));
    const { container } = render(<TeacherPanel session={session} />);
    await userEvent.click(screen.getByRole('button', { name: 'What can I try next?' }));
    await screen.findByText(/onerror/);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('keeps the conversation out of browser storage', async () => {
    api(ok(ANSWER));
    render(<TeacherPanel session={session} />);
    await userEvent.type(textbox(), 'my private question{Enter}');
    await screen.findByText(/for a value/);
    await waitFor(() => {
      const all = JSON.stringify({ ...window.localStorage, ...window.sessionStorage });
      expect(all).not.toContain('private question');
      expect(all).not.toContain('for a value');
    });
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
