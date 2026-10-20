import type { RouteObject } from 'react-router';
import { CalendarScreen } from '../features/calendar/CalendarScreen';
import { CoachScreen } from '../features/coach/CoachScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { NotFoundScreen } from '../features/not-found/NotFoundScreen';
import { NutritionScreen } from '../features/nutrition/NutritionScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { RecoveryScreen } from '../features/recovery/RecoveryScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TodayScreen } from '../features/today/TodayScreen';
import { TrainingScreen } from '../features/training/TrainingScreen';
import { AppShell } from './layout/AppShell';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'entrainement', element: <TrainingScreen /> },
      { path: 'calendrier', element: <CalendarScreen /> },
      { path: 'progres', element: <ProgressScreen /> },
      { path: 'plus', element: <MoreScreen /> },
      { path: 'recuperation', element: <RecoveryScreen /> },
      { path: 'nutrition', element: <NutritionScreen /> },
      { path: 'coach', element: <CoachScreen /> },
      { path: 'profil', element: <ProfileScreen /> },
      { path: 'reglages', element: <SettingsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
];
