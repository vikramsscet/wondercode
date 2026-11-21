import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/index.js';

export default function NotFoundPage() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-extrabold">We couldn't find that page</h1>
      <Link to="/" className={buttonClasses({ className: 'mt-6' })}>
        Go home
      </Link>
    </section>
  );
}
