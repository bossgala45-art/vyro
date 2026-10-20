import { HardDrive, ShieldCheck, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ONBOARDING_DRAFT_ID } from '../../data/repositories/profileRepository';
import { draftRepository } from '../../data/repositories/draftRepository';
import { Button } from '../../ui/Button';
import { LogoMark } from '../../ui/Logo';

const POINTS = [
  { icon: Trophy, title: 'Construit pour ton objectif', text: 'Musculation, basket et récupération, ensemble.' },
  { icon: HardDrive, title: 'Tout reste sur ton iPhone', text: 'Aucun compte, aucun serveur, aucune publicité.' },
  { icon: ShieldCheck, title: 'Honnête', text: 'Aucune donnée inventée : VYRO s’appuie seulement sur ce que tu enregistres.' },
];

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    let active = true;
    draftRepository
      .get(ONBOARDING_DRAFT_ID)
      .then((draft) => active && setHasDraft(draft !== undefined))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="animate-screen-in flex-1">
        <div className="relative mx-auto mt-6 grid size-28 place-items-center">
          <div aria-hidden className="absolute inset-0 rounded-full bg-volt-600/30 blur-2xl" />
          <LogoMark className="relative size-20" />
        </div>
        <h1 className="mt-8 text-center font-display text-4xl font-black tracking-[0.25em] text-snow">VYRO</h1>
        <p className="mt-2 text-center text-xs font-semibold tracking-[0.35em] text-volt-400">BUILD YOUR BEST.</p>

        <ul className="mt-12 space-y-5">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-volt-600/15 text-volt-400">
                <Icon aria-hidden size={20} />
              </span>
              <div>
                <p className="font-semibold text-snow">{title}</p>
                <p className="text-sm text-mist">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 space-y-3">
        <Button block onClick={() => navigate('/configuration')}>
          {hasDraft ? 'Reprendre la configuration' : 'Commencer'}
        </Button>
        <p className="text-center text-xs text-mist">Environ 3 minutes. Tout est modifiable ensuite.</p>
      </div>
    </main>
  );
}
