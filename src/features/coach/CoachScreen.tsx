import { ChevronRight, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { weeklyGoals } from '../../domain/coach/goals';
import { INTENT_IDS, INTENTS, type IntentId } from '../../domain/coach/intents';
import { greeting, proactiveMessages } from '../../domain/coach/messages';
import { localRulesCoach, remoteCoachAvailability } from '../../domain/coach/provider';
import { reviewToShow } from '../../domain/coach/review';
import type { CoachAnswer } from '../../domain/coach/types';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { AnswerCard, GoalsCard, MessageCard } from './CoachParts';
import { useCoachContext } from './useCoachContext';

const QUESTION_MAX = 200;

export function CoachScreen() {
  const ctx = useCoachContext();
  const [thread, setThread] = useState<{ id: number; question: string; answer: CoachAnswer }[]>([]);
  const [text, setText] = useState('');
  if (!ctx) return null;

  const hello = greeting(ctx);
  const messages = proactiveMessages(ctx);
  const goals = weeklyGoals(ctx);
  const newReview = reviewToShow(ctx);
  const remote = remoteCoachAvailability();

  const ask = async (question: string, intent: IntentId | null) => {
    const answer = await localRulesCoach.answer({ text: question, intent }, ctx);
    setThread((current) => [{ id: Date.now() + current.length, question, answer }, ...current].slice(0, 10));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    setText('');
    void ask(question, null);
  };

  return (
    <Screen title="Coach" subtitle="Ton coach VYRO">
      <Card className="bg-gradient-to-br from-volt-600/25 via-ink-900 to-ink-900">
        <p className="font-display text-xl font-semibold text-snow">{hello.title}</p>
        <p className="mt-1 text-sm text-snow/90">{hello.text}</p>
      </Card>

      {messages.length > 0 && (
        <section aria-label="Messages du coach" className="space-y-3">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </section>
      )}

      <GoalsCard goals={goals} />

      <Card>
        <h2 className="font-semibold text-snow">Pose-moi une question</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void ask(INTENTS[id].question, id)}
              className="min-h-11 rounded-full border border-ink-700 bg-ink-950 px-3 py-2 text-left text-sm text-snow active:bg-ink-800"
            >
              {INTENTS[id].question}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <label htmlFor="coach-question" className="sr-only">
            Ta question
          </label>
          <input
            id="coach-question"
            value={text}
            maxLength={QUESTION_MAX}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ou écris ta question…"
            enterKeyHint="send"
            className="min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-snow placeholder:text-mist/60 focus:border-volt-500 focus:outline-none"
          />
          <button type="submit" aria-label="Envoyer la question" className="grid size-12 shrink-0 place-items-center rounded-xl bg-volt-600 text-white active:bg-volt-500">
            <Send aria-hidden size={18} />
          </button>
        </form>
        <p className="mt-2 text-xs text-mist">
          {localRulesCoach.label} : je ne comprends que les questions proposées et leurs variantes proches. {remote.reason}
        </p>
      </Card>

      {thread.length > 0 && (
        <section aria-label="Réponses du coach" className="space-y-4">
          {thread.map((item) => (
            <AnswerCard key={item.id} question={item.question} answer={item.answer} />
          ))}
        </section>
      )}

      <nav aria-label="Coach">
        <ul className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/80">
          {[
            { to: '/coach/bilans', label: 'Bilans de 14 jours', description: newReview ? 'Nouveau bilan disponible' : 'Tes périodes passées en un coup d’œil' },
            { to: '/coach/motivation', label: 'Journal de motivation', description: 'Pourquoi tu t’entraînes, avec tes mots' },
            { to: '/entrainement/records', label: 'Records personnels', description: 'Calculés sur tes séries réelles' },
          ].map((link) => (
            <li key={link.to} className="border-b border-ink-700/60 last:border-b-0">
              <Link to={link.to} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-ink-800">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-snow">{link.label}</span>
                  <span className="block truncate text-sm text-mist">{link.description}</span>
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
