import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, SelectField, Spinner } from '../../components/ui/index.js';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import VisualExplanation from '../visuals/VisualExplanation.jsx';
import { LANGUAGES } from '../prompt-studio/promptStudioData.js';
import { QUESTION_MAX, SUGGESTED, parseParts } from './teacherData.js';

const errorText = (err) => {
  if (
    err instanceof ApiError &&
    ['TEACHER_LIMIT_REACHED', 'TEACHER_CONVERSATION_FULL'].includes(err.code)
  ) {
    return err.message; // friendly text written by the server
  }
  if (err instanceof ApiError && err.status === 429) {
    return 'Lots of questions! Please wait a little and try again.';
  }
  if (err instanceof ApiError && err.status === 401) {
    return 'Your visit has ended. Please start again from the home page.';
  }
  return "I couldn't answer just now. Please try again.";
};

// Message text is always shown as text (with `code` styled), never as HTML.
function Text({ text }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {parseParts(text).map((p, i) =>
        p.code ? (
          <code key={i} className="rounded bg-ink-100 px-1 font-mono text-sm">
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

// Chat with the AI teacher about the open project. The browser says which project and which
// lines are selected; the server reads the SAVED code itself, so no code is sent. The chat is
// kept by the server for a short time (restored after a reload, cleared with "Clear chat"),
// and nothing is written to browser storage.
export default function TeacherPanel({ session, file, edited, selection }) {
  const [language, setLanguage] = useState(session.defaultLanguage ?? 'en');
  const [messages, setMessages] = useState([]); // { role: child | teacher | note, text, isMock }
  const [followUps, setFollowUps] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [failure, setFailure] = useState(null); // { message, question }
  const [conversationId, setConversationId] = useState(null);
  const [useLines, setUseLines] = useState(true);
  const sendingRef = useRef(false);
  const touched = useRef(false); // true once the child has sent something in this visit

  // Restore the latest chat for this project.
  useEffect(() => {
    let live = true;
    apiRequest(`/teacher/conversations?projectId=${encodeURIComponent(session.projectId)}`, {
      childId: session.childId,
      guestToken: session.guestToken,
    })
      .then((data) => {
        if (!live || touched.current || !data.conversationId) return;
        setConversationId(data.conversationId);
        setMessages(
          data.messages.map(({ role, text, isMock, visual }) => ({ role, text, isMock, visual })),
        );
      })
      .catch(() => {}); // a missing history is not an error for the child
    return () => {
      live = false;
    };
  }, [session.projectId, session.childId, session.guestToken]);

  // The lines the teacher may look at: the selected SAVED lines of the open file.
  const lines = file ? file.content.split('\n').length : 0;
  const range =
    file && !edited && selection?.path === file.path
      ? { start: selection.startLine, end: Math.min(selection.endLine, lines) }
      : null;
  const sendLines = Boolean(range) && useLines;
  const rangeText = range
    ? range.start === range.end
      ? `line ${range.start}`
      : `lines ${range.start} to ${range.end}`
    : '';

  const send = async (raw, { retry = false } = {}) => {
    const question = raw.trim();
    if (!question || sendingRef.current) return;
    sendingRef.current = true;
    touched.current = true;
    setStatus('sending');
    setFailure(null);
    setFollowUps([]);
    if (!retry) {
      setMessages((m) => [...m, { role: 'child', text: question }]);
      setInput('');
    }
    try {
      const data = await apiRequest('/teacher/ask', {
        method: 'POST',
        body: {
          projectId: session.projectId,
          versionId: session.versionId,
          ...(conversationId && { conversationId }),
          question,
          explanationLanguage: language,
          ...(sendLines && {
            selection: { filePath: file.path, lineStart: range.start, lineEnd: range.end },
          }),
        },
        childId: session.childId,
        guestToken: session.guestToken,
      });
      if (data.status === 'ok') {
        setConversationId(data.conversationId);
        setMessages((m) => [
          ...m,
          { role: 'teacher', text: data.answer, isMock: data.isMock, visual: data.visual },
        ]);
        setFollowUps(data.followUps ?? []);
      } else {
        setMessages((m) => [...m, { role: 'note', text: data.message }]);
      }
      setStatus('idle');
    } catch (err) {
      setFailure({ message: errorText(err), question });
      setStatus('error');
    } finally {
      sendingRef.current = false;
    }
  };

  const clear = async () => {
    if (!conversationId) {
      setMessages([]);
      setFollowUps([]);
      return;
    }
    try {
      await apiRequest(`/teacher/conversations/${conversationId}`, {
        method: 'DELETE',
        childId: session.childId,
        guestToken: session.guestToken,
      });
      setMessages([]);
      setFollowUps([]);
      setConversationId(null);
      setFailure(null);
    } catch (err) {
      setFailure({ message: errorText(err), question: null });
    }
  };

  const chips = messages.length === 0 ? SUGGESTED[language] : followUps;
  const busy = status === 'sending';

  return (
    <Card className="mt-4" aria-labelledby="teacher-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="teacher-title" className="text-xl font-extrabold">
            Ask the AI teacher
          </h2>
          <p className="text-sm text-ink-600">
            I'm a computer helper, not a person. I can make mistakes, so try things out too!
          </p>
        </div>
        <SelectField
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div
        role="log"
        aria-label="Conversation with the AI teacher"
        aria-live="polite"
        className="mt-3 max-h-80 space-y-2 overflow-auto"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'child'
                ? 'ml-auto max-w-[85%] rounded-2xl bg-brand-600 px-4 py-2 text-white'
                : 'mr-auto max-w-[85%] rounded-2xl bg-ink-100 px-4 py-2'
            }
          >
            <span className="sr-only">{m.role === 'child' ? 'You said: ' : 'Teacher said: '}</span>
            <Text text={m.text} />
            {m.visual && <VisualExplanation visual={m.visual} language={language} />}
            {m.isMock && (
              <Badge tone="sun" className="mt-1">
                Sample answer
              </Badge>
            )}
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 font-semibold text-ink-600">
            <Spinner label="" /> Thinking…
          </p>
        )}
      </div>

      {failure && (
        <Alert tone="warning" className="mt-3">
          {failure.message}{' '}
          {failure.question && (
            <Button size="sm" onClick={() => send(failure.question, { retry: true })}>
              Try again
            </Button>
          )}
        </Alert>
      )}

      {chips.length > 0 && !busy && (
        <ul aria-label="Question ideas" className="mt-3 flex flex-wrap gap-2">
          {chips.map((q) => (
            <li key={q}>
              <Button size="sm" variant="secondary" onClick={() => send(q)}>
                {q}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-sm text-ink-700">
        {range ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useLines}
              onChange={(e) => setUseLines(e.target.checked)}
            />
            Show the teacher my selected lines ({file.path}, {rangeText})
          </label>
        ) : edited ? (
          <p>
            The teacher looks at your saved code. Reset your changes to this file to share lines.
          </p>
        ) : (
          <p>Select some lines in the code if you want to ask about them.</p>
        )}
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" className="mt-1" onClick={clear}>
            Clear chat
          </Button>
        )}
      </div>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="teacher-question" className="block text-sm font-bold text-ink-700">
          Ask the AI teacher
        </label>
        <textarea
          id="teacher-question"
          rows={2}
          maxLength={QUESTION_MAX}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          className="mt-1 w-full rounded-xl border-2 border-ink-200 p-3 hover:border-ink-300"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-ink-600">
            {input.length}/{QUESTION_MAX}
          </span>
          <Button type="submit" disabled={busy || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}
