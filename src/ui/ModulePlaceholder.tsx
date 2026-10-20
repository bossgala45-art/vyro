import { Construction } from 'lucide-react';
import { Card } from './Card';

interface ModulePlaceholderProps {
  /** Étape du plan de développement qui livrera ce module. */
  step: number;
  /** Fonctionnalités prévues (feuille de route, pas des données). */
  planned: readonly string[];
}

/**
 * Écran de module pas encore développé. Il l'indique clairement et n'affiche
 * aucune donnée fictive.
 */
export function ModulePlaceholder({ step, planned }: ModulePlaceholderProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-volt-600/15 text-volt-400">
          <Construction aria-hidden size={20} />
        </span>
        <div>
          <p className="font-semibold text-snow">Module en construction</p>
          <p className="text-sm text-mist">Prévu à l’étape {step} du développement</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-mist">Aucune donnée n’est affichée tant que ce module n’est pas développé.</p>
      <h2 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-volt-400">Prévu</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-snow/90">
        {planned.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-volt-500" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
