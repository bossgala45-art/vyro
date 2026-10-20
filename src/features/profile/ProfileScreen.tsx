import { Link } from 'react-router';
import { useProfile } from '../../data/hooks';
import { Screen } from '../../ui/Screen';
import { ProfileSummary } from './ProfileSummary';
import { WeightLog } from './WeightLog';

export function ProfileScreen() {
  const profile = useProfile();

  return (
    <Screen title="Profil" subtitle={profile?.firstName ?? 'Toi'}>
      <WeightLog />
      {profile && (
        <ProfileSummary
          profile={profile}
          renderEdit={(section, label) => (
            <Link
              to={`/profil/modifier/${section}`}
              aria-label={`Modifier : ${label}`}
              className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400"
            >
              Modifier
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
