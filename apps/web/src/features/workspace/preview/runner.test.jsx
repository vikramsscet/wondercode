import { act, fireEvent, render, screen } from '@testing-library/react';
import PreviewPane from '../PreviewPane.jsx';
import Workspace from '../Workspace.jsx';
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_MESSAGES,
  MAX_PER_SECOND,
  MAX_RUN_MS,
} from './previewProtocol.js';

const FILES = [
  { path: 'index.html', content: '<h1>Hi</h1><script src="script.js"></script>' },
  { path: 'script.js', content: 'console.log(1)' },
];
const btn = (name) => screen.getByRole('button', { name });
const chip = () => screen.getByText(/^(Ready when you are|Starting…|Running|Stopped)$/);

function frame() {
  const f = screen.getByTitle('Project preview');
  const nonce = /var N="([0-9a-f]+)"/.exec(f.getAttribute('srcdoc'))[1];
  return {
    f,
    nonce,
    send: (t, d) =>
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { n: nonce, t, d },
            source: f.contentWindow,
            origin: 'null',
          }),
        );
      }),
  };
}
const tick = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Run, Stop and Restart', () => {
  it('moves idle -> starting -> running -> stopped with the right buttons enabled', async () => {
    render(<PreviewPane files={FILES} />);
    expect(chip()).toHaveTextContent('Ready when you are');
    expect(btn('Run')).toBeEnabled();
    expect(btn('Stop')).toBeDisabled();
    expect(btn('Restart')).toBeDisabled();

    fireEvent.click(btn('Run'));
    expect(chip()).toHaveTextContent('Starting…');
    await frame().send('ready');
    expect(chip()).toHaveTextContent('Running');
    expect(btn('Run')).toBeDisabled();
    expect(btn('Stop')).toBeEnabled();
    expect(btn('Restart')).toBeEnabled();

    fireEvent.click(btn('Stop'));
    expect(chip()).toHaveTextContent('Stopped');
    expect(screen.queryByTitle('Project preview')).not.toBeInTheDocument();
    expect(screen.getByText('Your project is stopped')).toBeInTheDocument();
    expect(btn('Run')).toBeEnabled();
    expect(btn('Stop')).toBeDisabled();
  });

  it('keeps messages after Stop, and Restart clears them and uses a fresh nonce', async () => {
    render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    const first = frame();
    await first.send('ready');
    await first.send('log', { level: 'log', text: 'hello' });
    fireEvent.click(btn('Stop'));
    expect(screen.getByText('hello')).toBeInTheDocument();

    fireEvent.click(btn('Run'));
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
    const second = frame();
    expect(second.nonce).not.toBe(first.nonce);
    await second.send('ready');
    fireEvent.click(btn('Restart'));
    expect(frame().nonce).not.toBe(second.nonce);
  });

  it('restarts with the latest edits and nudges when code changed', async () => {
    const { rerender } = render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    await frame().send('ready');
    const edited = [{ path: 'index.html', content: '<h1>New</h1>' }, FILES[1]];
    rerender(<PreviewPane files={edited} />);
    expect(screen.getByText(/Your code has changed since this run/)).toBeInTheDocument();
    expect(screen.getByTitle('Project preview').getAttribute('srcdoc')).toContain('<h1>Hi</h1>');
    fireEvent.click(btn('Restart'));
    expect(screen.getByTitle('Project preview').getAttribute('srcdoc')).toContain('<h1>New</h1>');
    expect(screen.queryByText(/Your code has changed/)).not.toBeInTheDocument();
  });

  it('stops a page that says ready and then goes silent', async () => {
    render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    await frame().send('ready');
    await tick(HEARTBEAT_TIMEOUT_MS + 2000);
    expect(chip()).toHaveTextContent('Stopped');
    expect(screen.getByText(/wasn't responding/)).toBeInTheDocument();
  });

  it('keeps a healthy page alive past the message cap (heartbeats are not counted)', async () => {
    render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    const fr = frame();
    await fr.send('ready');
    for (let i = 0; i < MAX_MESSAGES + 20; i++) {
      await tick(1000);
      await fr.send('heartbeat');
    }
    expect(chip()).toHaveTextContent('Running');
    expect(screen.getByTitle('Project preview')).toBeInTheDocument();
  });

  it('stops after the maximum run time, with a friendly message', async () => {
    render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    const fr = frame();
    await fr.send('ready');
    for (let t = 0; t <= MAX_RUN_MS; t += 1000) {
      await tick(1000);
      if (screen.queryByTitle('Project preview')) await fr.send('heartbeat');
    }
    expect(chip()).toHaveTextContent('Stopped');
    expect(screen.getByText(/to save energy/)).toBeInTheDocument();
  });

  it('collapses repeats and limits message floods', async () => {
    render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    const fr = frame();
    await fr.send('ready');
    for (let i = 0; i < 3; i++) await fr.send('log', { level: 'log', text: 'same' });
    expect(screen.getByText('same (×3)')).toBeInTheDocument();
    for (let i = 0; i < MAX_PER_SECOND + 10; i++) {
      await fr.send('log', { level: 'log', text: `line ${i}` });
    }
    expect(screen.getByText('Some messages were hidden.')).toBeInTheDocument();
    expect(screen.queryByText(`line ${MAX_PER_SECOND + 5}`)).not.toBeInTheDocument();
  });

  it('removes the frame and its listener when the pane goes away', async () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<PreviewPane files={FILES} />);
    fireEvent.click(btn('Run'));
    unmount();
    expect(spy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(screen.queryByTitle('Project preview')).not.toBeInTheDocument();
  });

  it('switches to the Preview tab when Run is pressed in the workspace', () => {
    render(<Workspace files={FILES} title="T" />);
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(btn('Run'));
    expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  });
});
