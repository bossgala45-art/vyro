import { X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { todayIso } from '../../app/clock';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import type { WeeklyGoal } from '../../domain/coach/goals';
import { dismissMessage } from '../../domain/coach/state';
import type { CoachAnswer, CoachMessage } from '../../domain/coach/types';
import { Card } from '../../ui/Card';

const KIND_STYLES: Record<CoachMessage['kind'], string> = {
  safety: 'border-orange-400/40',
  recovery: 'border-amber-300/40',
  session: 'border-volt-500/50',
  celebration: 'border-emerald-400/40',
  planning: 'border-volt-500/30',
  review: 'border-volt-500/30',
  regularity: 'border-ink-700',
  motivation: 'border-ink-700',
  tracking: 'border-ink-700',
};

export function MessageCard({ message }: { message: CoachMessage }) {
  const [hiding, setHiding] = useState(false);
  const hide = async () => {
    setHiding(true);
    try {
      await settingsRepository.update((settings) => ({ ...settings, coach: dismissMessage(settings.coach, message.id, todayIso()) }));
    } catch {
      setHiding(false);
    }
  };
  return (
    <article aria-label={message.title} className={`rounded-2xl border bg-ink-900/80 p-4 ${KIND_STYLES[message.kind]}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-snow">{message.title}</h3>
        <button
          type="button"
          onClick={() => void hide()}
          disabled={hiding}
          aria-label={`Masquer : ${message.title}`}
          className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center text-mist active:text-snow"
        >
          <X aria-hidden size={16} />
        </button>
      </div>
      <p className="mt-1 text-sm text-snow/90">{message.text}</p>
      <p className="mt-2 text-xs text-mist">Basé sur {message.basedOn}.</p>
      {message.action && (
        <Link to={message.action.to} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-volt-400">
          {message.action.label} →
        </Link>
      )}
    </article>
  );
}

export function GoalsCard({ goals }: { goals: WeeklyGoal[] }) {
  return (
    <Card>
      <h2 className="font-semibold text-snow">Objectifs de la semaine</h2>
      <ul className="mt-3 space-y-3">
        {goals.map((goal) => {
          const percent = Math.min(100, Math.round((goal.done / goal.target) * 100));
          return (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-snow">{goal.label}</span>
                <span className="text-mist">
                  {goal.done}/{goal.target}
                  {goal.done >= goal.target ? ' ✅' : ''}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={goal.label}
                aria-valuemin={0}
                aria-valuemax={goal.target}
                aria-valuenow={goal.done}
                className="mt-1 h-2 overflow-hidden rounded-full bg-ink-800"
              >
                <div className="h-full rounded-full bg-volt-500" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-mist">{goal.why}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function AnswerCard({ question, answer }: { question: string; answer: CoachAnswer }) {
  return (
    <article aria-label={`Réponse : ${question}`} className="space-y-2">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-volt-600 px-3 py-2 text-sm text-white">{question}</p>
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm">
        <p className="font-semibold text-snow">{answer.title}</p>
        <ul className="mt-1 space-y-1 text-snow/90">
          {answer.lines.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
        {answer.basedOn.length > 0 && <p className="mt-2 text-xs text-mist">Données utilisées : {answer.basedOn.join(', ')}.</p>}
        {answer.links.map((link) => (
          <Link key={link.to} to={link.to} className="mt-1 mr-3 inline-flex min-h-11 items-center text-sm font-semibold text-volt-400">
            {link.label} →
          </Link>
        ))}
      </div>
    </article>
  );
}
