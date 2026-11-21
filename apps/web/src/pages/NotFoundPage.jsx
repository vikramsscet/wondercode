import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold">We couldn't find that page</h1>
      <Link to="/" className="mt-4 inline-block font-semibold text-indigo-600 underline">
        Go home
      </Link>
    </section>
  );
}
