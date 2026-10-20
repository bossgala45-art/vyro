import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { MORE_SECTIONS } from '../../app/navigation';
import { Screen } from '../../ui/Screen';

export function MoreScreen() {
  return (
    <Screen title="Plus" subtitle="Modules">
      <nav aria-label="Autres modules">
        <ul className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/80">
          {MORE_SECTIONS.map(({ path, label, description, icon: Icon }) => (
            <li key={path} className="border-b border-ink-700/60 last:border-b-0">
              <Link
                to={path}
                className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors active:bg-ink-800"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-volt-600/15 text-volt-400">
                  <Icon aria-hidden size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-snow">{label}</span>
                  <span className="block truncate text-sm text-mist">{description}</span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-mist" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Screen>
  );
}
