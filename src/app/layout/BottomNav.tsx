import { Link, useLocation } from 'react-router';
import { TAB_SECTIONS, isTabActive } from '../navigation';

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-700/70 bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TAB_SECTIONS.map(({ path, label, icon: Icon }) => {
          const active = isTabActive(path, pathname);
          return (
            <li key={path}>
              <Link
                to={path}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium transition-colors ${
                  active ? 'text-volt-400' : 'text-mist active:text-snow'
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
