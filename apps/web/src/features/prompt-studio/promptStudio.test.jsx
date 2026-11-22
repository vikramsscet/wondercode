import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../app/routes.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { ChildProfilesProvider } from '../child-profile/ChildProfilesContext.jsx';
import { GuestProvider } from '../guest/GuestContext.jsx';

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

const MIA = {
  id: 'c1',
  displayName: 'Mia',
  age: 9,
  avatarKey: 'fox',
  explanationLanguage: 'en',
  interests: [],
};
const l = (en) => ({ en, hi: `हिन्दी ${en}`, hinglish: `Hinglish ${en}` });
const PLAN = {
  title: 'My Quiz',
  description: 'A quiz about space.',
  projectType: 'quiz',
  features: ['Show one question'],
  interaction: [l('Click an answer.')],
  expectedBehaviour: [l('It checks your answer.')],
  files: ['index.html', 'style.css', 'script.js'],
  learningConcepts: ['Conditions'],
  childSummary: l('You will make a quiz.'),
};
const SAVED = {
  project: { id: 'p9', title: 'My Quiz' },
  version: { versionNumber: 1 },
  files: ['index.html', 'style.css', 'script.js'].map((path) => ({ path })),
  validated: false,
  isMock: true,
};
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
const ok = (data) => reply(200, { success: true, data });

// `planReplies`: queue of responses for POST /prompts/plan.
const generates = [];
const generateReplies = [];
function fakeApi(planReplies) {
  generates.length = 0;
  generateReplies.length = 0;
  const plans = [];
  const queue = [...planReplies];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method ?? 'GET';
      if (url.endsWith('/children') && method === 'GET') return ok([MIA]);
      if (url.endsWith('/auth/guest-session') && method === 'POST') {
        return reply(201, {
          success: true,
          data: {
            token: 'gtok',
            id: 'g1',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            limits: {},
          },
        });
      }
      if (url.endsWith('/projects/generate')) {
        generates.push({ headers: init.headers, body: JSON.parse(init.body) });
        const next = generateReplies.shift();
        if (next instanceof Error) throw next;
        return next ?? ok(SAVED);
      }
      if (url.endsWith('/prompts/plan')) {
        plans.push({ headers: init.headers, body: JSON.parse(init.body) });
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next;
      }
      return reply(404, { success: false, error: { code: 'NOT_FOUND', message: 'x' } });
    }),
  );
  return plans;
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

const asChild = async (replies) => {
  mocks.user = { id: 'p1', email: 'p@example.com' };
  window.sessionStorage.setItem('wondercode.activeChild', 'c1');
  const plans = fakeApi(replies);
  renderAt('/create');
  await screen.findByRole('heading', { name: 'What do you want to create?' });
  return plans;
};
const type = (text) => userEvent.type(screen.getByLabelText('Describe your idea'), text);
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Make my plan' }));

beforeEach(() => {
  mocks.user = null;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('Prompt Studio', () => {
  it('fills the prompt from a starter card and an example', async () => {
    await asChild([]);
    await userEvent.click(screen.getByRole('button', { name: /Quiz/ }));
    expect(screen.getByLabelText('Describe your idea')).toHaveValue('Make a quiz about animals');
    await userEvent.click(screen.getByRole('button', { name: 'Make a space quiz with planets' }));
    expect(screen.getByLabelText('Describe your idea')).toHaveValue(
      'Make a space quiz with planets',
    );
  });

  it('keeps "Make my plan" disabled until there is a prompt, and shows the counter', async () => {
    await asChild([]);
    expect(screen.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
    await type('a game');
    expect(screen.getByText('6 / 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make my plan' })).toBeEnabled();
  });

  it('sends the child id and profile language, then shows the plan in a chosen language', async () => {
    const plans = await asChild([
      ok({ status: 'ok', plan: PLAN, isMock: true, projectType: 'quiz', language: 'en' }),
    ]);
    await type('make a quiz about space');
    await submit();
    expect(await screen.findByRole('heading', { name: 'Here is your plan' })).toHaveFocus();
    expect(plans[0].headers['X-Child-Id']).toBe('c1');
    expect(plans[0].headers.Authorization).toBe('Bearer jwt');
    expect(plans[0].body).toEqual({ prompt: 'make a quiz about space', language: 'en' });
    expect(screen.getByText('Sample plan')).toBeInTheDocument();
    expect(screen.getByText('You will make a quiz.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी' }));
    expect(screen.getByText('हिन्दी You will make a quiz.')).toBeInTheDocument();
    expect(screen.getByText('हिन्दी Click an answer.')).toBeInTheDocument();
  });

  it('asks a clarifying question, then sends the answer', async () => {
    const plans = await asChild([
      ok({
        status: 'needs_clarification',
        plan: null,
        questions: [{ text: 'What should the quiz be about?', suggestions: [] }],
      }),
      ok({ status: 'ok', plan: PLAN, isMock: false }),
    ]);
    await type('make a quiz');
    await submit();
    expect(await screen.findByText('What should the quiz be about?')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your answer'), 'dinosaurs');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('heading', { name: 'Here is your plan' })).toBeInTheDocument();
    expect(plans[1].body.answers).toEqual(['dinosaurs']);
    expect(screen.queryByText('Sample plan')).not.toBeInTheDocument();
  });

  it('shows the calm message when blocked and lets the child start over', async () => {
    await asChild([ok({ status: 'blocked', plan: null, message: "I can't help with that one." })]);
    await type('something unsafe');
    await submit();
    expect(await screen.findByText("I can't help with that one.")).toBeInTheDocument();
    expect(screen.queryByText('something unsafe')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try a different idea' }));
    expect(
      screen.getByRole('heading', { name: 'What do you want to create?' }),
    ).toBeInTheDocument();
  });

  it('shows a friendly error and can retry', async () => {
    await asChild([new TypeError('network'), ok({ status: 'ok', plan: PLAN, isMock: true })]);
    await type('a quiz about space');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't make a plan");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Here is your plan' })).toBeInTheDocument();
  });

  it('saves the project when "Looks good!" is pressed and says opening it comes later', async () => {
    await asChild([ok({ status: 'ok', plan: PLAN, isMock: true })]);
    await type('a quiz about space');
    await submit();
    await userEvent.click(await screen.findByRole('button', { name: 'Looks good!' }));
    expect(await screen.findByRole('heading', { name: 'Your project is saved!' })).toHaveFocus();
    expect(screen.getByText('script.js')).toBeInTheDocument();
    expect(screen.getByText('Sample code')).toBeInTheDocument();
    expect(screen.getByText(/not ready yet/)).toBeInTheDocument();
    expect(generates[0].headers['X-Child-Id']).toBe('c1');
    expect(generates[0].body).toMatchObject({ plan: PLAN, prompt: 'a quiz about space' });
  });

  it('shows a friendly error if saving fails and retries the save, not the plan', async () => {
    await asChild([ok({ status: 'ok', plan: PLAN, isMock: true })]);
    generateReplies.push(new TypeError('network'));
    await type('a quiz about space');
    await submit();
    await userEvent.click(await screen.findByRole('button', { name: 'Looks good!' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't build your project");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Your project is saved!' }),
    ).toBeInTheDocument();
    expect(generates).toHaveLength(2);
  });

  it('shows the project-limit message for guests', async () => {
    fakeApi([ok({ status: 'ok', plan: PLAN, isMock: true })]);
    generateReplies.push(
      reply(409, {
        success: false,
        error: { code: 'GUEST_LIMIT_REACHED', message: 'Guests can make a few projects.' },
      }),
    );
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Try as Guest' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Start creating' }));
    await type('a quiz about space');
    await submit();
    await userEvent.click(await screen.findByRole('button', { name: 'Looks good!' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Guests can make a few projects.');
    expect(generates[0].headers['X-Guest-Token']).toBe('gtok');
  });

  it('pre-fills the prompt from a dashboard idea card', async () => {
    mocks.user = { id: 'p1', email: 'p@example.com' };
    window.sessionStorage.setItem('wondercode.activeChild', 'c1');
    fakeApi([]);
    renderAt('/dashboard');
    await userEvent.click((await screen.findAllByRole('link', { name: 'Start this idea' }))[0]);
    expect(await screen.findByLabelText('Describe your idea')).toHaveValue(
      'A cat that catches falling stars.',
    );
  });

  it('works for guests with the guest token and no parent credentials', async () => {
    const plans = fakeApi([ok({ status: 'ok', plan: PLAN, isMock: true })]);
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Try as Guest' }));
    await userEvent.click(await screen.findByRole('link', { name: 'Start creating' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/try/create'));
    await type('a quiz about space');
    await submit();
    await screen.findByRole('heading', { name: 'Here is your plan' });
    expect(plans[0].headers['X-Guest-Token']).toBe('gtok');
    expect(plans[0].headers).not.toHaveProperty('X-Child-Id');
    expect(plans[0].headers).not.toHaveProperty('Authorization');
  });

  it('does not keep the prompt in browser storage', async () => {
    await asChild([ok({ status: 'ok', plan: PLAN, isMock: true })]);
    await type('my very private idea');
    await submit();
    await screen.findByRole('heading', { name: 'Here is your plan' });
    expect(JSON.stringify({ ...window.sessionStorage, ...window.localStorage })).not.toContain(
      'private idea',
    );
  });
});
