import { getExercise } from './exercises';
import { templateLegDemand } from './program';
import type { SessionTemplate } from './types';

export interface WarmupStep {
  title: string;
  detail: string;
}

function roundTo(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value);
  return Math.max(increment, Math.round(value / increment) * increment);
}

/**
 * Échauffement adapté à la séance : général, mobilité ciblée, puis montée en charge
 * sur le premier exercice principal (jamais au-delà de la charge de travail).
 */
export function buildWarmup(template: SessionTemplate, firstMainLoadKg: number | null): WarmupStep[] {
  const steps: WarmupStep[] = [
    { title: '5 minutes de cardio léger', detail: 'Vélo, rameur ou corde à sauter, en restant capable de parler.' },
  ];

  const legs = templateLegDemand(template);
  steps.push(
    legs === 'none' || legs === 'low'
      ? {
          title: 'Mobilité des épaules',
          detail: '10 cercles de bras dans chaque sens, 10 rotations externes légères, 10 pompes contre un mur ou un banc.',
        }
      : {
          title: 'Mobilité hanches et chevilles',
          detail: '10 squats au poids du corps, 5 fentes par jambe, 10 balancements de jambe de chaque côté.',
        },
  );

  const firstMain = template.slots.find((slot) => slot.role === 'main') ?? template.slots[0];
  const exercise = firstMain ? getExercise(firstMain.exerciseId) : undefined;
  if (!firstMain || !exercise) return steps;

  if (exercise.loadType === 'bodyweight') {
    steps.push({
      title: `Séries d’approche — ${exercise.name}`,
      detail: `1 série facile de ${Math.max(3, Math.floor(firstMain.repMin / 2))} répétitions, sans forcer.`,
    });
  } else if (firstMainLoadKg === null) {
    steps.push({
      title: `Séries d’approche — ${exercise.name}`,
      detail:
        'Charge à déterminer : 2 séries de 10 puis 6 répétitions en augmentant progressivement une charge légère, jusqu’à trouver ta charge de travail.',
    });
  } else {
    const unit = exercise.loadPerHand ? ' par haltère' : '';
    const light = roundTo(firstMainLoadKg * 0.5, exercise.loadIncrementKg);
    const medium = roundTo(firstMainLoadKg * 0.75, exercise.loadIncrementKg);
    const ramp =
      medium >= firstMainLoadKg
        ? `1 série de 10 répétitions à ${light} kg${unit}.`
        : `10 répétitions à ${light} kg${unit}, puis 5 répétitions à ${medium} kg${unit}.`;
    steps.push({ title: `Séries d’approche — ${exercise.name}`, detail: ramp });
  }
  return steps;
}
