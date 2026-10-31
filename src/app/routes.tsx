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
import { HabitsScreen } from '../features/nutrition/HabitsScreen';
import { HydrationSettingsScreen } from '../features/nutrition/HydrationSettingsScreen';
import { IdeasScreen } from '../features/nutrition/IdeasScreen';
import { MealFormScreen } from '../features/nutrition/MealFormScreen';
import { NutritionScreen } from '../features/nutrition/NutritionScreen';
import { ProteinScreen } from '../features/nutrition/ProteinScreen';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { WelcomeScreen } from '../features/onboarding/WelcomeScreen';
import { ProfileEditScreen } from '../features/profile/ProfileEditScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { AddPhotoScreen } from '../features/progress/AddPhotoScreen';
import { CompareScreen } from '../features/progress/CompareScreen';
import { MeasurementsScreen } from '../features/progress/MeasurementsScreen';
import { PhotoScreen } from '../features/progress/PhotoScreen';
import { PhotosScreen } from '../features/progress/PhotosScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { CheckInScreen } from '../features/recovery/CheckInScreen';
import { RecoveryScreen } from '../features/recovery/RecoveryScreen';
import { ThresholdsScreen } from '../features/recovery/ThresholdsScreen';
import { TodayReadinessScreen } from '../features/recovery/TodayReadinessScreen';
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
          { path: 'progres/mensurations', element: <MeasurementsScreen /> },
          { path: 'progres/photos', element: <PhotosScreen /> },
          { path: 'progres/photos/nouvelle', element: <AddPhotoScreen /> },
          { path: 'progres/photos/:id', element: <PhotoScreen /> },
          { path: 'progres/comparer', element: <CompareScreen /> },
          { path: 'plus', element: <MoreScreen /> },
          { path: 'recuperation', element: <RecoveryScreen /> },
          { path: 'recuperation/check-in', element: <CheckInScreen /> },
          { path: 'recuperation/aujourdhui', element: <TodayReadinessScreen /> },
          { path: 'recuperation/reperes', element: <ThresholdsScreen /> },
          { path: 'nutrition', element: <NutritionScreen /> },
          { path: 'nutrition/repas/nouveau', element: <MealFormScreen /> },
          { path: 'nutrition/repas/:id', element: <MealFormScreen /> },
          { path: 'nutrition/idees', element: <IdeasScreen /> },
          { path: 'nutrition/proteines', element: <ProteinScreen /> },
          { path: 'nutrition/historique', element: <HabitsScreen /> },
          { path: 'nutrition/hydratation', element: <HydrationSettingsScreen /> },
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
