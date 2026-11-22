import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewPane from '../PreviewPane.jsx';
import { PREVIEW_CSP, buildPreviewDocument } from './buildPreviewDocument.js';
import { MAX_TEXT, acceptMessage } from './previewProtocol.js';

const FILES = [
  {
    path: 'index.html',
    content:
      '<html><head><base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=https://evil.example"><link rel="stylesheet" href="style.css"></head><body><h1>Hi</h1><script src="script.js"></script></body></html>',
  },
  { path: 'style.css', content: 'h1{color:red}' },
  { path: 'script.js', content: 'console.log("a </script> b");' },
];
const NONCE = 'abc123';

describe('buildPreviewDocument', () => {
  const html = buildPreviewDocument(FILES, NONCE);

  it('puts the CSP first, then the reporter, then the child code', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const [first, second] = doc.head.children;
    expect(first.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(first.getAttribute('content')).toBe(PREVIEW_CSP);
    expect(second.tagName).toBe('SCRIPT');
    expect(second.textContent).toContain(NONCE);
  });

  it('has a CSP that blocks network, frames, forms and external files', () => {
    for (const d of [
      "default-src 'none'",
      "connect-src 'none'",
      "frame-src 'none'",
      "form-action 'none'",
      "base-uri 'none'",
    ]) {
      expect(PREVIEW_CSP).toContain(d);
    }
    expect(PREVIEW_CSP).not.toMatch(/https?:|\*/);
  });

  it('inlines the CSS and JS and removes <base> and meta http-equiv tags from the project', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('base')).toBeNull();
    expect(doc.querySelectorAll('meta[http-equiv]')).toHaveLength(1); // only ours
    expect(doc.querySelector('link')).toBeNull();
    expect(doc.querySelector('script[src]')).toBeNull();
    expect(doc.querySelector('style').textContent).toBe('h1{color:red}');
  });

  it('cannot be broken out of by a closing script tag in the code', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const scripts = [...doc.querySelectorAll('script')];
    expect(scripts).toHaveLength(2);
    expect(scripts[1].textContent).toContain('a <\\/script> b');
    expect([...doc.body.childNodes].map((n) => n.nodeName)).toEqual(['H1', 'SCRIPT']);
  });

  it('returns null without index.html and leaves unknown references alone', () => {
    expect(buildPreviewDocument([FILES[1]], NONCE)).toBeNull();
    const out = buildPreviewDocument(
      [{ path: 'index.html', content: '<script src="https://x.example/a.js"></script>' }],
      NONCE,
    );
    expect(out).toContain('https://x.example/a.js'); // left as is; the CSP blocks it
  });
});

describe('acceptMessage', () => {
  const win = {};
  const ev = (over = {}) => ({
    source: win,
    origin: 'null',
    data: { n: NONCE, t: 'log', d: { level: 'warn', text: 'hi' } },
    ...over,
  });

  it('accepts a good message', () => {
    expect(acceptMessage(ev(), win, NONCE)).toEqual({ type: 'log', level: 'warn', text: 'hi' });
    expect(acceptMessage(ev({ data: { n: NONCE, t: 'heartbeat' } }), win, NONCE)).toEqual({
      type: 'heartbeat',
    });
  });

  it('rejects other windows, other origins, wrong nonces and unknown types', () => {
    expect(acceptMessage(ev({ source: {} }), win, NONCE)).toBeNull();
    expect(acceptMessage(ev({ origin: 'https://evil.example' }), win, NONCE)).toBeNull();
    expect(acceptMessage(ev({ data: { n: 'nope', t: 'log' } }), win, NONCE)).toBeNull();
    expect(acceptMessage(ev({ data: { n: NONCE, t: 'navigate' } }), win, NONCE)).toBeNull();
    expect(acceptMessage(ev({ data: 'text' }), win, NONCE)).toBeNull();
    expect(acceptMessage(ev(), null, NONCE)).toBeNull();
  });

  it('clips long text and normalises unknown log levels', () => {
    const m = acceptMessage(
      ev({ data: { n: NONCE, t: 'log', d: { level: 'x', text: 'a'.repeat(5000) } } }),
      win,
      NONCE,
    );
    expect(m.level).toBe('log');
    expect(m.text).toHaveLength(MAX_TEXT);
  });
});

describe('PreviewPane', () => {
  it('does not run anything until Run is pressed, then uses a locked-down iframe', async () => {
    render(<PreviewPane files={FILES} />);
    expect(screen.queryByTitle('Project preview')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const frame = screen.getByTitle('Project preview');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain(PREVIEW_CSP);
    expect(screen.getByRole('button', { name: 'Run again' })).toBeInTheDocument();
  });

  it('runs a snapshot: later edits do not change a running preview', async () => {
    const { rerender } = render(<PreviewPane files={FILES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const before = screen.getByTitle('Project preview').getAttribute('srcdoc');
    rerender(<PreviewPane files={[{ path: 'index.html', content: '<p>new</p>' }]} />);
    expect(screen.getByTitle('Project preview').getAttribute('srcdoc')).toBe(before);
  });

  it('explains when there is no index.html', async () => {
    render(<PreviewPane files={[FILES[1]]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByRole('status')).toHaveTextContent("couldn't find index.html");
  });

  it('shows messages and problems only from the real frame, and ignores forged ones', async () => {
    render(<PreviewPane files={FILES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const frame = screen.getByTitle('Project preview');
    const nonce = /var N="([0-9a-f]+)"/.exec(frame.getAttribute('srcdoc'))[1];
    const send = (data, source = frame.contentWindow, origin = 'null') =>
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data, source, origin }));
      });
    await send({ n: nonce, t: 'log', d: { level: 'log', text: 'forged' } }, window, 'null');
    await send(
      { n: nonce, t: 'log', d: { level: 'log', text: 'wrong origin' } },
      frame.contentWindow,
      'https://x',
    );
    expect(screen.queryByText('forged')).not.toBeInTheDocument();
    expect(screen.queryByText('wrong origin')).not.toBeInTheDocument();
    await send({ n: nonce, t: 'log', d: { level: 'log', text: 'hello' } });
    await send({ n: nonce, t: 'error', d: { message: 'oops is not defined' } });
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your code hit a problem: oops is not defined',
    );
    await send({ n: nonce, t: 'blocked' });
    expect(screen.getByRole('status')).toHaveTextContent("isn't allowed here");
  });

  it('removes a frame that stops reporting in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PreviewPane files={FILES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(screen.queryByTitle('Project preview')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("wasn't responding");
    vi.useRealTimers();
  });
});
