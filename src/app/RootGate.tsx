import { Navigate, Outlet, useLocation } from 'react-router';
import { useProfile } from '../data/hooks';
import { SplashScreen } from './StatusScreens';

const ONBOARDING_PATHS = ['/bienvenue', '/configuration'];

/** Oriente vers la configuration tant qu'aucun profil n'existe, et l'empêche ensuite. */
export function RootGate() {
  const profile = useProfile();
  const { pathname } = useLocation();

  if (profile === undefined) return <SplashScreen />;
  const onOnboarding = ONBOARDING_PATHS.includes(pathname);
  if (profile === null && !onOnboarding) return <Navigate to="/bienvenue" replace />;
  if (profile !== null && onOnboarding) return <Navigate to="/" replace />;
  return <Outlet />;
}
