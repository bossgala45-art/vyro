import { LIMITS, addTag, tagKey, type FieldErrors, type ProfileDraft, type ProfileSection } from '../../domain/profile/draft';
import { ChoiceGroup, MultiChoice, TagInput, TextAreaField, TextField, Toggle } from '../../ui/fields';
import { EQUIPMENT_LABELS, EXPERIENCE_LABELS, GOAL_LABELS, SEX_LABELS, toOptions } from './labels';

export interface SectionFieldsProps {
  draft: ProfileDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<ProfileDraft>) => void;
}

type TagField = 'likedExercises' | 'avoidedExercises' | 'foodsLiked' | 'foodsTolerated' | 'foodsRefused';

function tagHandlers({ draft, onChange }: SectionFieldsProps, field: TagField) {
  return {
    values: draft[field],
    onAdd: (value: string) => onChange({ [field]: addTag(draft[field], value) }),
    onRemove: (value: string) => onChange({ [field]: draft[field].filter((item) => tagKey(item) !== tagKey(value)) }),
  };
}

export function IdentityFields({ draft, errors, onChange, askWeight }: SectionFieldsProps & { askWeight: boolean }) {
  return (
    <div className="space-y-5">
      <TextField
        name="firstName"
        label="Prénom (facultatif)"
        hint="Utilisé uniquement pour personnaliser les messages."
        value={draft.firstName}
        onChange={(firstName) => onChange({ firstName })}
        error={errors.firstName}
        autoComplete="given-name"
        maxLength={LIMITS.firstNameLength + 10}
      />
      <TextField
        name="birthYear"
        label="Année de naissance"
        value={draft.birthYear}
        onChange={(birthYear) => onChange({ birthYear })}
        error={errors.birthYear}
        inputMode="numeric"
        placeholder="ex. 2008"
        maxLength={4}
      />
      <ChoiceGroup
        name="sex"
        label="Sexe"
        options={toOptions(SEX_LABELS)}
        value={draft.sex}
        onChange={(sex) => onChange({ sex })}
        error={errors.sex}
        columns={3}
      />
      <TextField
        name="heightCm"
        label="Taille"
        value={draft.heightCm}
        onChange={(heightCm) => onChange({ heightCm })}
        error={errors.heightCm}
        inputMode="decimal"
        placeholder="ex. 172"
        suffix="cm"
      />
      {askWeight && (
        <TextField
          name="weightKg"
          label="Poids actuel"
          hint="Première pesée de ton historique. Tu pourras en ajouter d’autres."
          value={draft.weightKg}
          onChange={(weightKg) => onChange({ weightKg })}
          error={errors.weightKg}
          inputMode="decimal"
          placeholder="ex. 58"
          suffix="kg"
        />
      )}
    </div>
  );
}

export function GoalFields({ draft, errors, onChange }: SectionFieldsProps) {
  return (
    <div className="space-y-5">
      <ChoiceGroup
        name="experience"
        label="Expérience en musculation"
        options={toOptions(EXPERIENCE_LABELS)}
        value={draft.experience}
        onChange={(experience) => onChange({ experience })}
        error={errors.experience}
      />
      <ChoiceGroup
        name="goalType"
        label="Objectif principal"
        options={Object.entries(GOAL_LABELS).map(([value, { label, description }]) => ({
          value: value as keyof typeof GOAL_LABELS,
          label,
          description,
        }))}
        value={draft.goalType}
        onChange={(goalType) => onChange({ goalType })}
        error={errors.goalType}
        columns={1}
      />
      <TextField
        name="targetDate"
        type="date"
        label="Date d’objectif"
        hint="Tu pourras la modifier à tout moment."
        value={draft.targetDate}
        onChange={(targetDate) => onChange({ targetDate })}
        error={errors.targetDate}
      />
      <TextAreaField
        name="goalNotes"
        label="Précisions (facultatif)"
        placeholder="ex. Équilibre entre basket, musculation et récupération"
        value={draft.goalNotes}
        onChange={(goalNotes) => onChange({ goalNotes })}
        error={errors.goalNotes}
        maxLength={LIMITS.notesLength}
      />
    </div>
  );
}

export function TrainingFields(props: SectionFieldsProps) {
  const { draft, errors, onChange } = props;
  return (
    <div className="space-y-5">
      <MultiChoice
        name="equipment"
        label="Matériel disponible"
        hint="Sélectionne tout ce que ta salle propose."
        options={toOptions(EQUIPMENT_LABELS)}
        values={draft.equipment}
        onChange={(equipment) => onChange({ equipment })}
        error={errors.equipment}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="sessionMin"
          label="Séance min."
          value={draft.sessionMin}
          onChange={(sessionMin) => onChange({ sessionMin })}
          error={errors.sessionMin}
          inputMode="numeric"
          placeholder="ex. 60"
          suffix="min"
        />
        <TextField
          name="sessionMax"
          label="Séance max."
          value={draft.sessionMax}
          onChange={(sessionMax) => onChange({ sessionMax })}
          error={errors.sessionMax}
          inputMode="numeric"
          placeholder="ex. 90"
          suffix="min"
        />
      </div>
      <div className="rounded-xl border border-ink-700 bg-ink-950 p-3">
        <Toggle
          label="Éviter le développé couché libre sans assistance"
          description="Le programme proposera des alternatives (haltères, machine, barre guidée) au lieu de la barre libre sans pareur."
          checked={draft.noUnassistedFreeBench}
          onChange={(noUnassistedFreeBench) => onChange({ noUnassistedFreeBench })}
        />
      </div>
      <TagInput
        name="likedExercises"
        label="Exercices que tu aimes (facultatif)"
        placeholder="ex. Tractions"
        error={errors.likedExercises}
        {...tagHandlers(props, 'likedExercises')}
      />
      <TagInput
        name="avoidedExercises"
        label="Exercices à éviter (facultatif)"
        placeholder="ex. Soulevé de terre"
        hint="Par goût, gêne ou contre-indication. Le programme n’en proposera pas."
        error={errors.avoidedExercises}
        {...tagHandlers(props, 'avoidedExercises')}
      />
    </div>
  );
}

export function FoodFields(props: SectionFieldsProps) {
  const { errors } = props;
  return (
    <div className="space-y-5">
      <p className="text-sm text-mist">
        Ces listes serviront aux idées de repas. Tout est facultatif et modifiable plus tard.
      </p>
      <TagInput
        name="foodsLiked"
        label="Aliments que tu aimes"
        placeholder="ex. Pâtes"
        error={errors.foodsLiked}
        {...tagHandlers(props, 'foodsLiked')}
      />
      <TagInput
        name="foodsTolerated"
        label="Aliments que tu tolères"
        placeholder="ex. Carottes"
        hint="Pas tes préférés, mais tu peux en manger."
        error={errors.foodsTolerated}
        {...tagHandlers(props, 'foodsTolerated')}
      />
      <TagInput
        name="foodsRefused"
        label="Aliments que tu refuses"
        placeholder="ex. Brocoli"
        hint="Ils ne seront jamais proposés."
        error={errors.foodsRefused}
        {...tagHandlers(props, 'foodsRefused')}
      />
    </div>
  );
}

export function SectionFields({
  section,
  askWeight = false,
  ...props
}: SectionFieldsProps & { section: ProfileSection; askWeight?: boolean }) {
  switch (section) {
    case 'identity':
      return <IdentityFields {...props} askWeight={askWeight} />;
    case 'goal':
      return <GoalFields {...props} />;
    case 'training':
      return <TrainingFields {...props} />;
    case 'foods':
      return <FoodFields {...props} />;
  }
}

export const SECTION_TITLES: Record<ProfileSection, string> = {
  identity: 'Toi',
  goal: 'Expérience et objectif',
  training: 'Entraînement',
  foods: 'Alimentation',
};
