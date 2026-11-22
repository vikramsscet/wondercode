import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AVATAR_KEYS, MAX_CHILDREN_PER_PARENT } from '@wondercode/shared';
import { routes } from '../../app/routes.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { GuestProvider } from '../guest/GuestContext.jsx';
import { avatars, getAvatar } from './avatars.js';
import { ChildProfilesProvider } from './ChildProfilesContext.jsx';

const mocks = vi.hoisted(() => ({ user: null, signOut: vi.fn() }));

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: mocks.user ? { access_token: 't', user: mocks.user } : null },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: mocks.signOut,
    },
  },
}));

const MIA = {
  id: 'c1',
  displayName: 'Mia',
  age: 9,
  avatarKey: 'fox',
  explanationLanguage: 'en',
  interests: [],
};
const ARJUN = {
  id: 'c2',
  displayName: 'Arjun',
  age: 11,
  avatarKey: 'robot',
  explanationLanguage: 'hinglish',
  interests: [],
};

// Tiny fake API: GET/POST /children backed by an array.
function fakeApi(initial, { failList = false } = {}) {
  const store = [...initial];
  const calls = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body && JSON.parse(init.body), headers: init.headers });
    const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (url.endsWith('/children') && method === 'GET') {
      return failList
        ? reply(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } })
        : reply(200, { success: true, data: store });
    }
    if (url.endsWith('/children') && method === 'POST') {
      if (store.length >= MAX_CHILDREN_PER_PARENT) {
        return reply(409, {
          success: false,
          error: { code: 'CHILD_LIMIT_REACHED', message: 'Limit reached.' },
        });
      }
      const child = { id: `c${store.length + 1}`, interests: [], ...JSON.parse(init.body) };
      store.push(child);
      return reply(201, { success: true, data: child });
    }
    return reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'x' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, store };
}

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <ChildProfilesProvider>
        <GuestProvider>
          <RouterProvider router={router} />
        </GuestProvider>
      </ChildProfilesProvider>
    </AuthProvider>,
  );
  return router;
}

beforeEach(() => {
  mocks.user = { id: 'parent-1', email: 'p@example.com' };
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('avatars', () => {
  it('has artwork for every shared avatar key and falls back safely', () => {
    expect(avatars.map((a) => a.key)).toEqual(AVATAR_KEYS);
    expect(avatars.every((a) => a.emoji && a.label)).toBe(true);
    expect(getAvatar('does-not-exist').key).toBe(AVATAR_KEYS[0]);
  });
});

describe('profile picker', () => {
  it('lists the parent’s children and opens the dashboard for the chosen one', async () => {
    fakeApi([MIA, ARJUN]);
    const router = renderAt('/profiles');
    await userEvent.click(await screen.findByRole('button', { name: /Mia/ }));
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Hi, Mia!');
    expect(window.sessionStorage.getItem('wondercode.activeChild')).toBe('c1');
  });

  it('prompts a parent with no children to add one, and saves the new profile', async () => {
    const api = fakeApi([]);
    renderAt('/profiles');
    expect(await screen.findByText(/Create a profile for your child/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Add a child/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add a child profile' });
    await userEvent.type(within(dialog).getByLabelText('Nickname'), 'Zoe');
    await userEvent.selectOptions(within(dialog).getByLabelText('Age'), '10');
    await userEvent.click(within(dialog).getByLabelText(/Owl/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Zoe/ })).toBeInTheDocument());
    const post = api.calls.find((c) => c.method === 'POST');
    expect(post.body).toEqual({
      displayName: 'Zoe',
      age: 10,
      avatarKey: 'owl',
      explanationLanguage: 'en',
    });
  });

  it('hides "Add a child" at the profile limit', async () => {
    const full = Array.from({ length: MAX_CHILDREN_PER_PARENT }, (_, i) => ({
      ...MIA,
      id: `x${i}`,
      displayName: `Kid${i}`,
    }));
    fakeApi(full);
    renderAt('/profiles');
    await screen.findByRole('button', { name: /Kid0/ });
    expect(screen.queryByRole('button', { name: /Add a child/ })).not.toBeInTheDocument();
  });

  it('shows a friendly error with a retry when profiles cannot be loaded', async () => {
    fakeApi([], { failList: true });
    renderAt('/profiles');
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load the profiles");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('child dashboard', () => {
  it('redirects to the picker when no child is active', async () => {
    fakeApi([MIA]);
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/profiles'));
  });

  it('redirects signed-out visitors to sign in', async () => {
    mocks.user = null;
    fakeApi([MIA]);
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
  });

  it('ignores a stored child that does not belong to the signed-in parent', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'someone-elses-child');
    fakeApi([MIA]);
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/profiles'));
  });

  it('restores the active child after a reload', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'c2');
    fakeApi([MIA, ARJUN]);
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Hi, Arjun!');
  });

  it('shows the active child in the header and labels sample content as a preview', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'c1');
    fakeApi([MIA]);
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByTestId('active-child')).getByText('Mia')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'My Coding Journey' }).parentElement,
    ).toHaveTextContent('Preview');
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });

  it('keeps parent-only controls out of the child area', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'c1');
    fakeApi([MIA]);
    renderAt('/dashboard');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: /parent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/add a child/i)).not.toBeInTheDocument();
  });

  it('switches profiles without signing out', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'c1');
    fakeApi([MIA, ARJUN]);
    const router = renderAt('/dashboard');
    await userEvent.click(await screen.findByRole('button', { name: 'Switch profile' }));
    expect(router.state.location.pathname).toBe('/profiles');
    await userEvent.click(await screen.findByRole('button', { name: /Arjun/ }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Hi, Arjun!');
    expect(within(screen.getByTestId('active-child')).getByText('Arjun')).toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
