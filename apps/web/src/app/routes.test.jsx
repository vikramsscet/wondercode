import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes.jsx';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';

const renderAt = (path) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('routes', () => {
  it('renders the home page inside the layout', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'WonderCode' })).toBeInTheDocument();
    expect(screen.getByText(/Imagine it/)).toBeInTheDocument();
  });

  it('renders not-found for unknown paths', () => {
    renderAt('/nope');
    expect(screen.getByText(/couldn't find that page/)).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('shows a friendly message when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
