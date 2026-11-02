import { Link } from 'react-router';

interface Support {
  standalone: boolean;
  notifications: boolean;
  push: boolean;
}

export function detectNotificationSupport(): Support {
  return {
    standalone:
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    notifications: 'Notification' in window,
    push: 'PushManager' in window && 'serviceWorker' in navigator,
  };
}

/**
 * Notifications : uniquement ce qui fonctionne vraiment, et des alternatives.
 * VYRO ne demande pas l'autorisation de notifier : sans serveur d'envoi (Web Push),
 * une app web ne peut pas prévenir l'utilisateur quand elle est fermée sur iPhone.
 */
export function NotificationSettings() {
  const support = detectNotificationSupport();
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-snow">Rappels qui fonctionnent</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-mist">
          <li>Dans VYRO, quand l’app est ouverte : hydratation, messages du coach, minuteur de repos.</li>
          <li>
            Alertes du Calendrier de l’iPhone, même app fermée : exporte tes{' '}
            <Link to="/calendrier/export" className="font-medium text-volt-400">
              séances
            </Link>{' '}
            et tes{' '}
            <Link to="/nutrition/hydratation" className="font-medium text-volt-400">
              rappels d’hydratation
            </Link>
            .
          </li>
        </ul>
      </div>
      <div>
        <p className="font-medium text-snow">Notifications de l’iPhone : non utilisées</p>
        <p className="mt-1 text-mist">
          Pour notifier quand l’app est fermée, une app web a besoin d’un serveur d’envoi (Web Push). VYRO n’en a pas, pour que tes
          données ne quittent jamais ton iPhone : l’autorisation n’est donc pas demandée et aucune notification n’est promise.
        </p>
        <p className="mt-1 text-xs text-mist">
          Sur cet appareil : {support.standalone ? 'app installée sur l’écran d’accueil' : 'ouverte dans le navigateur'} · Web Push{' '}
          {support.push ? 'techniquement disponible' : 'indisponible'}.
        </p>
      </div>
    </div>
  );
}
