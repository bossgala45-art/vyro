import { Navigate, type RouteObject } from 'react-router';
import { ActivityFormScreen } from '../features/calendar/ActivityFormScreen';
import { ActivityLogScreen } from '../features/calendar/ActivityLogScreen';
import { BasketScreen } from '../features/calendar/BasketScreen';
import { DayScreen } from '../features/calendar/DayScreen';
import { ExportScreen } from '../features/calendar/ExportScreen';
import { UsualPlanningScreen } from '../features/calendar/UsualPlanningScreen';
import { VacationScreen } from '../features/calendar/VacationScreen';
import { CalendarScreen } from '../features/calendar/CalendarScreen';
import { CoachScreen } from '../features/coach/CoachScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { NotFoundScreen } from '../features/not-found/NotFoundScreen';
import { NutritionScreen } from '../features/nutrition/NutritionScreen';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { WelcomeScreen } from '../features/onboarding/WelcomeScreen';
import { ProfileEditScreen } from '../features/profile/ProfileEditScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { RecoveryScreen } from '../features/recovery/RecoveryScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { TodayScreen } from '../features/today/TodayScreen';
import { HistoryScreen, WorkoutDetailScreen } from '../features/training/HistoryScreen';
import { ProgramScreen } from '../features/training/ProgramScreen';
import { RecordsScreen } from '../features/training/RecordsScreen';
import { SlotEditScreen } from '../features/training/SlotEditScreen';
import { TrainingScreen } from '../features/training/TrainingScreen';
import { WorkoutScreen } from '../features/training/WorkoutScreen';
import { AppShell } from './layout/AppShell';
import { RootGate } from './RootGate';
import { RouteErrorScreen } from './StatusScreens';

export const routes: RouteObject[] = [
  {
    element: <RootGate />,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: 'bienvenue', element: <WelcomeScreen /> },
      { path: 'configuration', element: <OnboardingScreen /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <TodayScreen /> },
          { path: 'entrainement', element: <TrainingScreen /> },
          { path: 'entrainement/planning', element: <Navigate to="/calendrier/habituel" replace /> },
          { path: 'entrainement/programme', element: <ProgramScreen /> },
          { path: 'entrainement/programme/:key/:index', element: <SlotEditScreen /> },
          { path: 'entrainement/seance/:id', element: <WorkoutScreen /> },
          { path: 'entrainement/historique', element: <HistoryScreen /> },
          { path: 'entrainement/historique/:id', element: <WorkoutDetailScreen /> },
          { path: 'entrainement/records', element: <RecordsScreen /> },
          { path: 'calendrier', element: <CalendarScreen /> },
          { path: 'calendrier/jour/:date', element: <DayScreen /> },
          { path: 'calendrier/activite/nouvelle', element: <ActivityFormScreen /> },
          { path: 'calendrier/activite/:id', element: <ActivityFormScreen /> },
          { path: 'calendrier/habituel', element: <UsualPlanningScreen /> },
          { path: 'calendrier/vacances', element: <VacationScreen /> },
          { path: 'calendrier/export', element: <ExportScreen /> },
          { path: 'calendrier/suivi/:occurrenceId', element: <ActivityLogScreen /> },
          { path: 'calendrier/basket', element: <BasketScreen /> },
          { path: 'progres', element: <ProgressScreen /> },
          { path: 'plus', element: <MoreScreen /> },
          { path: 'recuperation', element: <RecoveryScreen /> },
          { path: 'nutrition', element: <NutritionScreen /> },
          { path: 'coach', element: <CoachScreen /> },
          { path: 'profil', element: <ProfileScreen /> },
          { path: 'profil/modifier/:section', element: <ProfileEditScreen /> },
          { path: 'reglages', element: <SettingsScreen /> },
          { path: '*', element: <NotFoundScreen /> },
        ],
      },
    ],
  },
];
