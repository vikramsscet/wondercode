import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../app/routes.jsx';
import { ChildProfilesProvider } from '../child-profile/ChildProfilesContext.jsx';
import { AuthProvider } from './AuthContext.jsx';

const mocks = vi.hoisted(() => ({
  session: null,
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../../services/supabase.js', () => ({
  isAuthConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  },
}));

const renderAt = (path) =>
  render(
    <AuthProvider>
      <ChildProfilesProvider>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
      </ChildProfilesProvider>
    </AuthProvider>,
  );

beforeEach(() => {
  mocks.session = null;
  vi.clearAllMocks();
});

describe('parent auth', () => {
  it('redirects signed-out visitors from /parent to sign in', async () => {
    renderAt('/parent');
    expect(await screen.findByRole('heading', { name: 'Parent sign in' })).toBeInTheDocument();
  });

  it('shows a friendly error for wrong credentials', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    renderAt('/sign-in');
    await userEvent.type(await screen.findByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is not correct.');
  });

  it('rejects short passwords on sign up without calling Supabase', async () => {
    renderAt('/sign-up');
    await userEvent.type(await screen.findByLabelText('Your name'), 'Pat');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8');
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('asks the parent to confirm their email when no session is returned', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    renderAt('/sign-up');
    await userEvent.type(await screen.findByLabelText('Your name'), 'Pat');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Check your email'));
  });

  it('lets a signed-in parent into /parent', async () => {
    mocks.session = { access_token: 't', user: { id: 'u1', email: 'a@b.com' } };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () => ({
          success: true,
          data: url.endsWith('/children') ? [] : { displayName: 'Pat', email: 'a@b.com' },
        }),
      })),
    );
    renderAt('/parent');
    expect(await screen.findByText('Pat')).toBeInTheDocument();
  });
});
