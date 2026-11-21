import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import { routes } from './routes.jsx';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
