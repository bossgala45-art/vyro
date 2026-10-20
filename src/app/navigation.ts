import {
  Apple,
  BatteryCharging,
  CalendarDays,
  Dumbbell,
  House,
  LayoutGrid,
  MessageCircle,
  Settings,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface Section {
  /** Chemin de la route, relatif à la racine de l'application. */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Courte description affichée dans le menu « Plus ». */
  description: string;
}

/** Onglets de la barre de navigation inférieure (5 maximum pour rester lisible sur iPhone). */
export const TAB_SECTIONS: readonly Section[] = [
  { path: '/', label: 'Aujourd’hui', icon: House, description: 'Ta journée sportive' },
  { path: '/entrainement', label: 'Séances', icon: Dumbbell, description: 'Programme de musculation' },
  { path: '/calendrier', label: 'Calendrier', icon: CalendarDays, description: 'Basket, séances et repos' },
  { path: '/progres', label: 'Progrès', icon: TrendingUp, description: 'Mensurations, photos et records' },
  { path: '/plus', label: 'Plus', icon: LayoutGrid, description: 'Autres modules' },
];

/** Modules accessibles depuis l'onglet « Plus ». */
export const MORE_SECTIONS: readonly Section[] = [
  { path: '/recuperation', label: 'Récupération', icon: BatteryCharging, description: 'Check-in, sommeil et fatigue' },
  { path: '/nutrition', label: 'Nutrition', icon: Apple, description: 'Repas et hydratation' },
  { path: '/coach', label: 'Coach', icon: MessageCircle, description: 'Conseils et bilans' },
  { path: '/profil', label: 'Profil', icon: UserRound, description: 'Tes informations sportives' },
  { path: '/reglages', label: 'Réglages', icon: Settings, description: 'Confidentialité et sauvegardes' },
];

function isWithin(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Indique si un chemin appartient à l'onglet « Plus » (pour l'état actif de la barre). */
export function isMoreSectionPath(pathname: string): boolean {
  return isWithin(pathname, '/plus') || MORE_SECTIONS.some((section) => isWithin(pathname, section.path));
}

/** Onglet de la barre inférieure à mettre en évidence pour le chemin courant. */
export function isTabActive(tabPath: string, pathname: string): boolean {
  if (tabPath === '/') return pathname === '/';
  if (tabPath === '/plus') return isMoreSectionPath(pathname);
  return isWithin(pathname, tabPath);
}
