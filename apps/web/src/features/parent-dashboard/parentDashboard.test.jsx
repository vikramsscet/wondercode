import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../app/routes.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { ChildProfilesProvider } from '../child-profile/ChildProfilesContext.jsx';

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 't', user: { id: 'parent-1', email: 'p@example.com' } } },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: vi.fn(),
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

// Fake API with the real endpoints the parent dashboard uses.
function fakeApi(initial, { failDelete = false } = {}) {
  const store = initial.map((child) => ({ ...child })); // clone: tests mutate the store
  const calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method ?? 'GET';
      const path = url.replace(/^.*\/api\/v1/, '');
      calls.push({ path, method, body: init.body && JSON.parse(init.body) });
      const reply = (status, data) => ({
        ok: status < 400,
        status,
        json: async () =>
          status < 400
            ? { success: true, data }
            : { success: false, error: { code: 'X', message: 'x' } },
      });
      if (path === '/auth/me')
        return reply(200, {
          id: 'parent-1',
          email: 'p@example.com',
          displayName: 'Pat Parent',
          uiLanguage: 'en',
        });
      if (path === '/children' && method === 'GET') return reply(200, store);
      if (path === '/children' && method === 'POST') {
        const child = { id: `n${store.length}`, interests: [], ...JSON.parse(init.body) };
        store.push(child);
        return reply(201, child);
      }
      const match = /^\/children\/(.+)$/.exec(path);
      if (match && method === 'PATCH') {
        Object.assign(
          store.find((c) => c.id === match[1]),
          JSON.parse(init.body),
        );
        return reply(
          200,
          store.find((c) => c.id === match[1]),
        );
      }
      if (match && method === 'DELETE') {
        if (failDelete) return reply(500);
        store.splice(
          store.findIndex((c) => c.id === match[1]),
          1,
        );
        return reply(200, { id: match[1], deleted: true });
      }
      return reply(404);
    }),
  );
  return { calls, store };
}

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <ChildProfilesProvider>
        <RouterProvider router={router} />
      </ChildProfilesProvider>
    </AuthProvider>,
  );
  return router;
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('parent dashboard shell', () => {
  it('shows the account and child count on the overview, with all tabs', async () => {
    fakeApi([MIA, ARJUN]);
    renderAt('/parent');
    expect(await screen.findByText('Pat Parent')).toBeInTheDocument();
    expect(screen.getByText('2 profiles')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Parent dashboard' });
    for (const label of ['Overview', 'Children', 'Projects', 'Progress', 'Usage', 'Privacy']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it.each([
    ['projects', 'Projects'],
    ['progress', 'Progress'],
    ['usage', 'Usage'],
  ])('shows an honest coming-soon panel for %s, with no invented numbers', async (path, title) => {
    fakeApi([MIA]);
    renderAt(`/parent/${path}`);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b\d+ (projects|hours|minutes)\b/i);
  });

  it('lists exactly what is stored about a child on the privacy page', async () => {
    fakeApi([MIA]);
    renderAt('/parent/privacy');
    const stored = await screen.findByRole('region', { name: 'What we keep about each child' });
    for (const item of [
      'Nickname',
      'Age (8 to 12)',
      'Avatar',
      'Preferred language for explanations',
    ]) {
      expect(within(stored).getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });
});

describe('managing children', () => {
  it('lists children with age and language', async () => {
    fakeApi([MIA, ARJUN]);
    renderAt('/parent/children');
    expect(await screen.findByText('Mia')).toBeInTheDocument();
    expect(screen.getByText('Age 11 · Explanations in Hinglish')).toBeInTheDocument();
  });

  it('edits a child and sends the changes', async () => {
    const api = fakeApi([MIA]);
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Mia' }));
    const dialog = screen.getByRole('dialog', { name: "Edit Mia's profile" });
    const name = within(dialog).getByLabelText('Nickname');
    expect(name).toHaveValue('Mia');
    await userEvent.clear(name);
    await userEvent.type(name, 'Mia R');
    await userEvent.selectOptions(within(dialog).getByLabelText('Age'), '10');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.getByText('Mia R')).toBeInTheDocument());
    const patch = api.calls.find((c) => c.method === 'PATCH');
    expect(patch.path).toBe('/children/c1');
    expect(patch.body).toMatchObject({
      displayName: 'Mia R',
      age: 10,
      avatarKey: 'fox',
      explanationLanguage: 'en',
    });
  });

  it('adds a child from the parent dashboard', async () => {
    const api = fakeApi([MIA]);
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Add a child' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a child profile' });
    await userEvent.type(within(dialog).getByLabelText('Nickname'), 'Zoe');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(screen.getByText('Zoe')).toBeInTheDocument());
    expect(api.calls.some((c) => c.method === 'POST')).toBe(true);
  });

  it('asks for confirmation before deleting, then removes the profile', async () => {
    const api = fakeApi([MIA, ARJUN]);
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Mia' }));
    const dialog = screen.getByRole('dialog', { name: "Delete Mia's profile?" });
    expect(api.calls.some((c) => c.method === 'DELETE')).toBe(false);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(screen.queryByText('Mia')).not.toBeInTheDocument());
    expect(screen.getByText('Arjun')).toBeInTheDocument();
    expect(api.calls.find((c) => c.method === 'DELETE').path).toBe('/children/c1');
  });

  it('does nothing when deletion is cancelled', async () => {
    const api = fakeApi([MIA]);
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Mia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep profile' }));
    expect(screen.getByText('Mia')).toBeInTheDocument();
    expect(api.calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('keeps the profile and explains when deletion fails', async () => {
    fakeApi([MIA], { failDelete: true });
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Mia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't delete that profile");
    expect(screen.getByText('Mia')).toBeInTheDocument();
  });

  it('forgets the active child when that profile is deleted', async () => {
    window.sessionStorage.setItem('wondercode.activeChild', 'c1');
    fakeApi([MIA, ARJUN]);
    renderAt('/parent/children');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Mia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete profile' }));
    await waitFor(() => expect(screen.queryByText('Mia')).not.toBeInTheDocument());
    expect(window.sessionStorage.getItem('wondercode.activeChild')).toBeNull();
  });

  it('disables Add a child at the limit', async () => {
    fakeApi(Array.from({ length: 5 }, (_, i) => ({ ...MIA, id: `x${i}`, displayName: `Kid${i}` })));
    renderAt('/parent/children');
    expect(await screen.findByRole('button', { name: 'Add a child' })).toBeDisabled();
  });
});
