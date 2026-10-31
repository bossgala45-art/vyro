import { Link } from 'react-router';
import { todayIso } from '../../app/clock';
import { weekStart } from '../../domain/training/schedule';
import { formatTimeRange } from '../calendar/labels';
import { useWeek } from '../calendar/usePlanning';
import { HydrationCard } from '../nutrition/HydrationCard';
import { useNutritionToday } from '../nutrition/useNutritionToday';
import { ReadinessPanel } from '../recovery/ReadinessPanel';
import { useReadinessData } from '../recovery/readiness';
import { useProfile } from '../../data/hooks';
import { daysBetween } from '../../domain/common/dates';
import { Card } from '../../ui/Card';
import { LogoMark } from '../../ui/Logo';
import { ModulePlaceholder } from '../../ui/ModulePlaceholder';
import { formatLongDate } from '../profile/labels';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function TodayScreen() {
  const profile = useProfile();
  const week = useWeek(weekStart(todayIso()));
  const readiness = useReadinessData()?.readiness;
  const nutrition = useNutritionToday();
  const today = dateFormatter.format(new Date());
  const todayDate = todayIso();
  const activities = week?.occurrences.filter((occurrence) => occurrence.date === todayDate && !occurrence.suspended) ?? [];
  const session = week?.plan?.sessions.find((item) => item.date === todayDate);
  const sessionStatus = session ? week?.statuses.get(todayDate) : undefined;
  const daysLeft = profile ? daysBetween(todayIso(), profile.goal.targetDate) : null;

  return (
    <section aria-labelledby="screen-title" className="animate-screen-in px-4 pb-6">
      <header className="flex items-center gap-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <LogoMark />
        <div>
          <h1 id="screen-title" className="font-display text-2xl font-black tracking-[0.2em] text-snow">
            VYRO
          </h1>
          <p className="text-[0.7rem] font-semibold tracking-[0.3em] text-volt-400">BUILD YOUR BEST.</p>
        </div>
      </header>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-volt-600/25 via-ink-900 to-ink-900">
          <p className="text-sm text-mist">{profile?.firstName ? `Salut ${profile.firstName} 👋` : 'Aujourd’hui'}</p>
          <p className="mt-1 font-display text-xl font-semibold text-snow first-letter:uppercase">{today}</p>
          {profile && daysLeft !== null && (
            <p className="mt-3 text-sm text-mist">
              {daysLeft > 0 ? (
                <>
                  <strong className="font-display text-2xl text-volt-400">J-{daysLeft}</strong> avant ton objectif du{' '}
                  {formatLongDate(profile.goal.targetDate)}
                </>
              ) : (
                'Ta date d’objectif est atteinte : fixe-toi la suivante dans ton profil.'
              )}
            </p>
          )}
        </Card>

        {week && (
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-snow">Au programme aujourd’hui</h2>
              <Link to={`/calendrier/jour/${todayDate}`} className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
                Détails
              </Link>
            </div>
            {activities.length === 0 && !session ? (
              <p className="mt-1 text-sm text-mist">Rien de prévu dans ton calendrier.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-snow">
                {activities.map((activity) => (
                  <li key={activity.id}>
                    {activity.title} · {formatTimeRange(activity)}
                  </li>
                ))}
                {session && (
                  <li>
                    Musculation : séance {session.templateKey}
                    {session.startTime ? ` à ${session.startTime}` : ''}
                    {session.light ? ' (version allégée conseillée)' : ''}
                    {sessionStatus === 'done' ? ' — faite ✓' : ''}
                  </li>
                )}
              </ul>
            )}
          </Card>
        )}

        {readiness && (
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-snow">Ta forme du jour</h2>
              {readiness.checkIn && (
                <Link to="/recuperation/aujourdhui" className="flex min-h-11 items-center px-2 text-sm font-medium text-volt-400">
                  Conseil
                </Link>
              )}
            </div>
            {readiness.checkIn ? (
              <div className="mt-2">
                <ReadinessPanel decision={readiness.decision} compact />
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-mist">30 secondes pour savoir si ta séance doit être normale, allégée ou remplacée par du repos.</p>
                <Link
                  to="/recuperation/check-in"
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-volt-600 px-4 font-semibold text-white active:bg-volt-500"
                >
                  Faire mon check-in
                </Link>
              </>
            )}
          </Card>
        )}

        {nutrition && <HydrationCard nutrition={nutrition} compact />}

        <ModulePlaceholder step={8} planned={['Message du coach basé sur tes données réelles', 'Bilan automatique tous les 14 jours']} />
      </div>
    </section>
  );
}
