import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExperimentPanel from './ExperimentPanel.jsx';

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } },
}));

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
const ok = (data) => reply(200, { success: true, data });
const fail = (status, code, message) => reply(status, { success: false, error: { code, message } });
const RESULT = {
  status: 'ok',
  version: { id: 'v2', versionNumber: 2, origin: 'refined' },
  previousVersionId: 'v1',
  changedFiles: [
    {
      path: 'style.css',
      summary: {
        en: 'Changed the background.',
        hi: 'बैकग्राउंड बदला।',
        hinglish: 'Background badla.',
      },
    },
  ],
};
const EXP = { projectId: 'p1', versionId: 'v1', childId: 'c1', defaultLanguage: 'en' };
let calls;
function api(response = () => ok(RESULT)) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      const r = response();
      if (r instanceof Error) throw r;
      return r;
    }),
  );
}
const panel = (props = {}) => {
  const onOpen = vi.fn();
  const onReload = vi.fn();
  render(
    <ExperimentPanel
      experiment={EXP}
      edited={false}
      onOpen={onOpen}
      onReload={onReload}
      {...props}
    />,
  );
  return { onOpen, onReload };
};
const box = () => screen.getByLabelText('What do you want to change?');

beforeEach(() => vi.unstubAllGlobals());

describe('ExperimentPanel', () => {
  it('asks to open a saved project in the sample workspace', () => {
    render(<ExperimentPanel experiment={undefined} edited={false} />);
    expect(screen.getByText('Open a saved project to try changes.')).toBeInTheDocument();
  });

  it('sends the change with the version it is based on, then shows what changed', async () => {
    api();
    const { onOpen } = panel();
    await userEvent.type(box(), 'Make the background blue');
    await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
    expect(await screen.findByText(/This is version 2/)).toBeInTheDocument();
    expect(screen.getByText(/Your earlier version is safe/)).toBeInTheDocument();
    expect(screen.getByText('style.css')).toBeInTheDocument();
    expect(screen.getByText(/Changed the background\./)).toBeInTheDocument();
    expect(calls[0].url).toMatch(/\/projects\/p1\/experiments$/);
    expect(calls[0].headers['X-Child-Id']).toBe('c1');
    expect(calls[0].body).toEqual({
      baseVersionId: 'v1',
      instruction: 'Make the background blue',
      language: 'en',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Open the new version' }));
    expect(onOpen).toHaveBeenCalledWith(RESULT);
    expect(box()).toHaveValue(''); // cleared after success
  });

  it('starts from an idea chip and writes the summary in the chosen language', async () => {
    api();
    panel();
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hinglish');
    await userEvent.click(screen.getByRole('button', { name: 'Make the title bigger' }));
    expect(await screen.findByText(/Background badla\./)).toBeInTheDocument();
    expect(calls[0].body).toMatchObject({
      instruction: 'Make the title bigger',
      language: 'hinglish',
    });
  });

  it('cannot send an empty change, and limits the length', () => {
    api();
    panel();
    expect(screen.getByRole('button', { name: 'Try it' })).toBeDisabled();
    expect(box()).toHaveAttribute('maxlength', '500');
  });

  it('blocks experiments while there are unsaved edits and sends nothing', async () => {
    api();
    panel({ edited: true });
    expect(screen.getByText(/Reset your unsaved changes first/)).toBeInTheDocument();
    expect(box()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Make the title bigger' })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });

  it('shows a calm note when the idea is blocked, too short or changes nothing', async () => {
    for (const message of ["I can't help with that one.", "I didn't change anything this time."]) {
      api(() => ok({ status: 'blocked', message }));
      const { unmount } = render(<ExperimentPanel experiment={EXP} edited={false} />);
      await userEvent.type(box(), 'something');
      await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Open the new version' }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it('offers to open the project again when it has a newer version', async () => {
    api(() => fail(409, 'VERSION_OUTDATED', 'x'));
    const { onReload } = panel();
    await userEvent.type(box(), 'Make it blue');
    await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
    expect(await screen.findByText(/newer version/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open it again' }));
    expect(onReload).toHaveBeenCalled();
  });

  it('shows the server’s friendly text for limits, and a generic message for failures', async () => {
    api(() => fail(429, 'EXPERIMENT_LIMIT_REACHED', "You've tried lots of changes today!"));
    panel();
    await userEvent.type(box(), 'Make it blue');
    await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
    expect(await screen.findByText(/tried lots of changes today/)).toBeInTheDocument();

    api(() => new TypeError('network'));
    await userEvent.click(screen.getByRole('button', { name: 'Make the title bigger' }));
    expect(await screen.findByText(/couldn't make that change just now/)).toBeInTheDocument();
  });

  it('prevents double sends while waiting', async () => {
    let release;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise((r) => (release = () => r(ok(RESULT))))),
    );
    panel();
    await userEvent.type(box(), 'Make it blue');
    await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
    expect(screen.getByText('Making your change…')).toBeInTheDocument();
    expect(box()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Make the title bigger' })).toBeDisabled();
    release();
    await screen.findByText(/This is version 2/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the guest token for guests', async () => {
    api();
    panel({ experiment: { projectId: 'p1', versionId: 'v1', guestToken: 'gtok' } });
    await userEvent.click(screen.getByRole('button', { name: 'Make the title bigger' }));
    await screen.findByText(/This is version 2/);
    expect(calls[0].headers['X-Guest-Token']).toBe('gtok');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });
});
