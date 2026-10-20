import { Card } from '../../ui/Card';
import { LogoMark } from '../../ui/Logo';
import { ModulePlaceholder } from '../../ui/ModulePlaceholder';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function TodayScreen() {
  const today = dateFormatter.format(new Date());

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
          <p className="text-sm text-mist">Aujourd’hui</p>
          <p className="mt-1 font-display text-xl font-semibold text-snow first-letter:uppercase">{today}</p>
        </Card>

        <ModulePlaceholder
          step={5}
          planned={[
            'Séance du jour adaptée à ton planning basket',
            'Check-in rapide de récupération',
            'Message du coach basé sur tes données réelles',
          ]}
        />
      </div>
    </section>
  );
}
