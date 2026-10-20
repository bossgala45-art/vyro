import { Link } from 'react-router';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';

export function NotFoundScreen() {
  return (
    <Screen title="Page introuvable">
      <Card>
        <p className="text-mist">Cette page n’existe pas dans VYRO.</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-volt-600 px-4 font-semibold text-white active:bg-volt-500"
        >
          Retour à l’accueil
        </Link>
      </Card>
    </Screen>
  );
}
