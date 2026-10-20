import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ProfileSection } from '../../domain/profile/draft';
import type { Profile } from '../../domain/profile/types';
import { Card } from '../../ui/Card';
import { SECTION_TITLES } from './ProfileSectionFields';
import { EQUIPMENT_LABELS, EXPERIENCE_LABELS, GOAL_LABELS, SEX_LABELS, formatLongDate } from './labels';

const formatNumber = (value: number) => value.toLocaleString('fr-FR');
const listOrDash = (items: readonly string[]) => (items.length > 0 ? items.join(', ') : '—');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-mist">{label}</dt>
      <dd className="text-right text-sm text-snow">{children}</dd>
    </div>
  );
}

interface ProfileSummaryProps {
  profile: Profile;
  /** Poids saisi à la configuration (affiché dans le récapitulatif). */
  initialWeightKg?: number | undefined;
  /** Rendu du bouton « Modifier » d'une section. */
  renderEdit: (section: ProfileSection, label: string) => ReactNode;
}

export function ProfileSummary({ profile, initialWeightKg, renderEdit }: ProfileSummaryProps) {
  const sections: Record<ProfileSection, ReactNode> = {
    identity: (
      <>
        <Row label="Prénom">{profile.firstName ?? '—'}</Row>
        <Row label="Année de naissance">{profile.birthYear}</Row>
        <Row label="Sexe">{SEX_LABELS[profile.sex]}</Row>
        <Row label="Taille">{formatNumber(profile.heightCm)} cm</Row>
        {initialWeightKg !== undefined && <Row label="Poids">{formatNumber(initialWeightKg)} kg</Row>}
      </>
    ),
    goal: (
      <>
        <Row label="Expérience">{EXPERIENCE_LABELS[profile.experience]}</Row>
        <Row label="Objectif">{GOAL_LABELS[profile.goal.type].label}</Row>
        <Row label="Date d’objectif">{formatLongDate(profile.goal.targetDate)}</Row>
        {profile.goal.notes && <Row label="Précisions">{profile.goal.notes}</Row>}
      </>
    ),
    training: (
      <>
        <Row label="Matériel">{listOrDash(profile.training.equipment.map((item) => EQUIPMENT_LABELS[item]))}</Row>
        <Row label="Durée de séance">
          {profile.training.sessionMinutes.min} à {profile.training.sessionMinutes.max} min
        </Row>
        <Row label="Développé couché libre seul">{profile.training.noUnassistedFreeBench ? 'Évité' : 'Autorisé'}</Row>
        <Row label="Aimés">{listOrDash(profile.training.likedExercises)}</Row>
        <Row label="À éviter">{listOrDash(profile.training.avoidedExercises)}</Row>
      </>
    ),
    foods: (
      <>
        <Row label="Aimés">{listOrDash(profile.foods.liked)}</Row>
        <Row label="Tolérés">{listOrDash(profile.foods.tolerated)}</Row>
        <Row label="Refusés">{listOrDash(profile.foods.refused)}</Row>
      </>
    ),
  };

  return (
    <>
      {(Object.keys(sections) as ProfileSection[]).map((section) => (
        <Card key={section}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-snow">{SECTION_TITLES[section]}</h2>
            {renderEdit(section, SECTION_TITLES[section])}
          </div>
          <dl className="mt-2 divide-y divide-ink-700/60">{sections[section]}</dl>
        </Card>
      ))}
    </>
  );
}

export function EditIcon() {
  return <Pencil aria-hidden size={14} />;
}
