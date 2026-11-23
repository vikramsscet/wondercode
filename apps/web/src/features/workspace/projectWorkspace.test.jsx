import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../app/routes.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { ChildProfilesProvider } from '../child-profile/ChildProfilesContext.jsx';
import { GuestProvider } from '../guest/GuestContext.jsx';
import { draftKey } from './drafts.js';

const mocks = vi.hoisted(() => ({ user: null }));
vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: mocks.user ? { access_token: 'jwt', user: mocks.user } : null },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: vi.fn(),
    },
  },
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

const MIA = {
  id: 'c1',
  displayName: 'Mia',
  age: 9,
  avatarKey: 'fox',
  explanationLanguage: 'en',
  interests: [],
};
const PROJECT = {
  project: { id: 'p1', title: 'My Quiz' },
  version: { id: 'v1', versionNumber: 1 },
  files: [
    { path: 'index.html', language: 'html', content: '<h1>Quiz</h1>', sizeBytes: 13 },
    { path: 'script.js', language: 'javascript', content: 'let a = 1;', sizeBytes: 10 },
  ],
  validated: true,
};
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

let calls;
function fakeApi({ project = reply(200, { success: true, data: PROJECT }) } = {}) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      calls.push({ url, headers: init.headers });
      if (url.endsWith('/children')) return reply(200, { success: true, data: [MIA] });
      if (url.includes('/projects/')) return typeof project === 'function' ? project() : project;
      return reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'x' } });
    }),
  );
}
function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const { unmount } = render(
    <AuthProvider>
      <ChildProfilesProvider>
        <GuestProvider>
          <RouterProvider router={router} />
        </GuestProvider>
      </ChildProfilesProvider>
    </AuthProvider>,
  );
  return Object.assign(router, { unmount });
}
const asChild = () => {
  mocks.user = { id: 'p', email: 'p@example.com' };
  window.sessionStorage.setItem('wondercode.activeChild', 'c1');
};
const editor = (path) => screen.findByLabelText(`Editor ${path}`);

beforeEach(() => {
  mocks.user = null;
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('opening a saved project', () => {
  it('loads the project for a child with the child headers', async () => {
    asChild();
    fakeApi();
    renderAt('/workspace/p1');
    expect(await screen.findByRole('heading', { level: 1, name: /My Quiz/ })).toBeInTheDocument();
    expect(screen.getByText('Version 1, checked')).toBeInTheDocument();
    expect(screen.queryByText('Sample')).not.toBeInTheDocument();
    expect(await editor('index.html')).toHaveValue('<h1>Quiz</h1>');
    const call = calls.find((c) => c.url.endsWith('/projects/p1'));
    expect(call.headers['X-Child-Id']).toBe('c1');
    expect(call.headers.Authorization).toBe('Bearer jwt');
  });

  it('shows a friendly message when the project is not found, and one for failures', async () => {
    asChild();
    fakeApi({
      project: reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'x' } }),
    });
    renderAt('/workspace/nope');
    expect(await screen.findByText("We couldn't find that project.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make a new project' })).toHaveAttribute(
      'href',
      '/create',
    );
  });

  it('can retry after an error', async () => {
    asChild();
    let n = 0;
    fakeApi({
      project: () =>
        ++n === 1
          ? reply(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } })
          : reply(200, { success: true, data: PROJECT }),
    });
    renderAt('/workspace/p1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Your files are safe');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: /My Quiz/ })).toBeInTheDocument();
  });

  it('keeps the guest workspace behind the guest session', async () => {
    fakeApi();
    const router = renderAt('/try/workspace/p1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(calls.some((c) => c.url.includes('/projects/'))).toBe(false);
  });
});

describe('experiments', () => {
  const V2 = {
    ...PROJECT,
    version: { id: 'v2', versionNumber: 2 },
    files: [
      PROJECT.files[0],
      { path: 'script.js', language: 'javascript', content: 'let a = 2;', sizeBytes: 10 },
    ],
  };
  const RESULT = {
    status: 'ok',
    version: { id: 'v2', versionNumber: 2, origin: 'refined' },
    previousVersionId: 'v1',
    changedFiles: [{ path: 'script.js', summary: { en: 'Changed the number.' } }],
  };

  it('opens the new version, marks what changed, and keeps drafts per version', async () => {
    asChild();
    let served = PROJECT;
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        calls.push({ url, method: init.method ?? 'GET' });
        if (url.endsWith('/children')) return reply(200, { success: true, data: [MIA] });
        if (url.endsWith('/experiments')) {
          served = V2;
          return reply(200, { success: true, data: RESULT });
        }
        if (url.includes('/teacher/')) {
          return reply(200, { success: true, data: { conversationId: null, messages: [] } });
        }
        return reply(200, { success: true, data: served });
      }),
    );
    window.localStorage.setItem(
      draftKey('c1', 'p1', 'v1'),
      JSON.stringify({ savedAt: Date.now(), edits: { 'script.js': 'old draft' } }),
    );
    renderAt('/workspace/p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Throw away' }));
    await userEvent.type(screen.getByLabelText('What do you want to change?'), 'Change the number');
    await userEvent.click(screen.getByRole('button', { name: 'Try it' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Open the new version' }));

    expect(await screen.findByText('Version 2, checked')).toBeInTheDocument();
    expect(screen.getByText(/This is version 2\. You changed script\.js/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /script\.js/ })).toHaveTextContent('changed');
    expect(screen.getByRole('button', { name: /index\.html/ })).not.toHaveTextContent('changed');
    await userEvent.click(screen.getByRole('button', { name: /script\.js/ }));
    expect(await editor('script.js')).toHaveValue('let a = 2;');
    const post = calls.find((c) => c.url.endsWith('/experiments'));
    expect(post.method).toBe('POST');
  });
});

describe('editing, preview and unsaved edits', () => {
  it('previews exactly the code in the editor', async () => {
    asChild();
    fakeApi();
    renderAt('/workspace/p1');
    await userEvent.type(await editor('index.html'), '!!');
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    const srcdoc = screen.getByTitle('Project preview').getAttribute('srcdoc');
    expect(srcdoc).toContain('<h1>Quiz</h1>!!');
  });

  it('saves a draft, offers it after a reload, and restores it on request', async () => {
    asChild();
    fakeApi();
    const first = renderAt('/workspace/p1');
    await userEvent.type(await editor('index.html'), 'X');
    await waitFor(() =>
      expect(window.localStorage.getItem(draftKey('c1', 'p1', 'v1'))).toContain('Quiz</h1>X'),
    );
    first.unmount();
    asChild(); // a reload keeps the tab's active child

    renderAt('/workspace/p1');
    expect(await screen.findByText(/We found changes you hadn't saved/)).toBeInTheDocument();
    expect(await editor('index.html')).toHaveValue('<h1>Quiz</h1>'); // not applied silently
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(await editor('index.html')).toHaveValue('<h1>Quiz</h1>X');
    expect(screen.getByText('Changed, not saved')).toBeInTheDocument();
  });

  it('throws a draft away on request', async () => {
    asChild();
    window.localStorage.setItem(
      draftKey('c1', 'p1', 'v1'),
      JSON.stringify({ savedAt: Date.now(), edits: { 'script.js': 'let a = 9;' } }),
    );
    fakeApi();
    renderAt('/workspace/p1');
    await userEvent.click(await screen.findByRole('button', { name: 'Throw away' }));
    expect(window.localStorage.getItem(draftKey('c1', 'p1', 'v1'))).toBeNull();
    expect(screen.queryByText(/We found changes/)).not.toBeInTheDocument();
  });

  it('does not offer another child’s draft', async () => {
    asChild();
    window.localStorage.setItem(
      draftKey('c2', 'p1', 'v1'),
      JSON.stringify({ savedAt: Date.now(), edits: { 'script.js': 'let a = 9;' } }),
    );
    fakeApi();
    renderAt('/workspace/p1');
    await editor('index.html');
    expect(screen.queryByText(/We found changes/)).not.toBeInTheDocument();
  });

  it('resets one file or all changes, and clears the stored draft', async () => {
    asChild();
    fakeApi();
    renderAt('/workspace/p1');
    await userEvent.type(await editor('index.html'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Reset this file' }));
    expect(await editor('index.html')).toHaveValue('<h1>Quiz</h1>');
    expect(screen.queryByRole('button', { name: 'Reset all changes' })).not.toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(draftKey('c1', 'p1', 'v1'))).toBeNull());
  });

  it('warns before leaving the page only while there are unsaved edits', async () => {
    asChild();
    fakeApi();
    renderAt('/workspace/p1');
    const leave = () => {
      const e = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(e);
      });
      return e.defaultPrevented;
    };
    await userEvent.type(await editor('index.html'), 'X');
    expect(leave()).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Reset all changes' }));
    expect(leave()).toBe(false);
  });
});
