import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { proactiveMessages } from '../../domain/coach/messages';
import { Card } from '../../ui/Card';
import { MessageCard } from './CoachParts';
import { useCoachContext } from './useCoachContext';

/** Sur l'accueil : les deux messages les plus importants du coach. */
export function CoachTodayCard() {
  const ctx = useCoachContext();
  if (!ctx) return null;
  const messages = proactiveMessages(ctx).slice(0, 2);
  return (
    <section aria-label="Coach" className="space-y-3">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
      <Card>
        <Link to="/coach" className="flex min-h-11 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-volt-600/15 text-volt-400">
            <MessageCircle aria-hidden size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-snow">Parler au coach</span>
            <span className="block text-sm text-mist">Objectifs, bilans, questions sur ta journée</span>
          </span>
        </Link>
      </Card>
    </section>
  );
}
