import AppLayout from '../components/layout/AppLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
