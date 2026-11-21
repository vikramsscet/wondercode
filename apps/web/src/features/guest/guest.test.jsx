import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../app/routes.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { GuestProvider } from './GuestContext.jsx';

const mocks = vi.hoisted(() => ({ user: null }));

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: mocks.user ? { access_token: 't', user: mocks.user } : null },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: vi.fn(),
    },
  },
}));

const future = () => new Date(Date.now() + 60 * 60000).toISOString();
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <GuestProvider>
        <RouterProvider router={router} />
      </GuestProvider>
    </AuthProvider>,
  );
  return router;
}

beforeEach(() => {
  mocks.user = null;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('landing page', () => {
  it('offers separate guest and parent entry points', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Imagine it. Build it.');
    expect(screen.getByRole('button', { name: 'Try as Guest' })).toBeInTheDocument();
    const parents = screen.getByRole('region', { name: 'For parents and guardians' });
    expect(parents).toHaveTextContent('Create account');
    expect(parents).toHaveTextContent('Parent sign in');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
  });

  it('sends a signed-in parent to profile selection, with a separate parent area link', async () => {
    mocks.user = { id: 'u1', email: 'p@example.com' };
    renderAt('/');
    expect(await screen.findByRole('link', { name: 'Choose a profile' })).toHaveAttribute(
      'href',
      '/profiles',
    );
    expect(screen.getAllByRole('link', { name: 'Parent area' })[0]).toHaveAttribute(
      'href',
      '/parent',
    );
  });
});

describe('Try as Guest', () => {
  it('starts a session, stores it for this tab only and opens the guest area', async () => {
    const fetchMock = vi.fn(async () =>
      reply(201, {
        success: true,
        data: { token: 'tok', id: 'g1', expiresAt: future(), limits: {} },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Try as Guest' }));
    expect(await screen.findByRole('heading', { name: 'Welcome, explorer!' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/try');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/guest-session$/);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(window.sessionStorage.getItem('wondercode.guest')).token).toBe('tok');
    expect(window.localStorage.getItem('wondercode.guest')).toBeNull();
  });

  it('shows a friendly message when too many guests are visiting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        reply(429, { success: false, error: { code: 'RATE_LIMITED', message: 'x' } }),
      ),
    );
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Try as Guest' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('try again in a little while');
    expect(screen.queryByText('Welcome, explorer!')).not.toBeInTheDocument();
  });

  it('shows a friendly message when the API is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('network'))),
    );
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Try as Guest' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't start your visit");
  });
});

describe('guest area', () => {
  it('redirects to the landing page without a guest session', async () => {
    const router = renderAt('/try');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('ignores an expired stored session', async () => {
    window.sessionStorage.setItem(
      'wondercode.guest',
      JSON.stringify({ token: 'old', expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );
    const router = renderAt('/try');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(window.sessionStorage.getItem('wondercode.guest')).toBeNull();
  });

  it('restores a valid session and ends it with the guest token only', async () => {
    window.sessionStorage.setItem(
      'wondercode.guest',
      JSON.stringify({ token: 'tok', expiresAt: future() }),
    );
    const fetchMock = vi.fn(async () => reply(200, { success: true, data: { ended: true } }));
    vi.stubGlobal('fetch', fetchMock);
    const router = renderAt('/try');
    await userEvent.click(await screen.findByRole('button', { name: 'End my visit' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Guest-Token']).toBe('tok');
    expect(init.headers.Authorization).toBeUndefined(); // never mixes guest and parent credentials
    expect(window.sessionStorage.getItem('wondercode.guest')).toBeNull();
  });

  it('points guests to parents for saving, without exposing parent features', async () => {
    window.sessionStorage.setItem(
      'wondercode.guest',
      JSON.stringify({ token: 'tok', expiresAt: future() }),
    );
    renderAt('/try');
    expect(await screen.findByText(/Ask a parent or guardian/)).toBeInTheDocument();
    expect(screen.queryByText('Parent area')).not.toBeInTheDocument();
  });
});
