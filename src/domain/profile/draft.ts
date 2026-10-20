import { addYears, isIsoDate, type IsoDate } from '../common/dates';
import {
  EQUIPMENT,
  EXPERIENCE_LEVELS,
  GOAL_TYPES,
  SEXES,
  type Equipment,
  type ExperienceLevel,
  type GoalType,
  type Profile,
  type Sex,
} from './types';

/**
 * Valeurs saisies dans les formulaires, encore sous forme de texte.
 * Un champ vide reste vide : aucune valeur n'est inventée.
 */
export interface ProfileDraft {
  firstName: string;
  birthYear: string;
  sex: Sex | '';
  heightCm: string;
  /** Poids initial, demandé uniquement à la configuration (ensuite : historique de pesées). */
  weightKg: string;
  experience: ExperienceLevel | '';
  goalType: GoalType | '';
  targetDate: string;
  goalNotes: string;
  equipment: Equipment[];
  sessionMin: string;
  sessionMax: string;
  likedExercises: string[];
  avoidedExercises: string[];
  noUnassistedFreeBench: boolean;
  foodsLiked: string[];
  foodsTolerated: string[];
  foodsRefused: string[];
}

export type DraftField = keyof ProfileDraft;
export type FieldErrors = Partial<Record<DraftField, string>>;

export const PROFILE_SECTIONS = ['identity', 'goal', 'training', 'foods'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export const SECTION_FIELDS: Record<ProfileSection, readonly DraftField[]> = {
  identity: ['firstName', 'birthYear', 'sex', 'heightCm', 'weightKg'],
  goal: ['experience', 'goalType', 'targetDate', 'goalNotes'],
  training: ['equipment', 'sessionMin', 'sessionMax', 'likedExercises', 'avoidedExercises', 'noUnassistedFreeBench'],
  foods: ['foodsLiked', 'foodsTolerated', 'foodsRefused'],
};

export const LIMITS = {
  minAge: 13,
  maxAge: 100,
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
  sessionMinutes: { min: 20, max: 180 },
  maxGoalYears: 10,
  firstNameLength: 40,
  notesLength: 500,
  tagLength: 60,
  tagCount: 100,
} as const;

export function emptyDraft(): ProfileDraft {
  return {
    firstName: '',
    birthYear: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    experience: '',
    goalType: '',
    targetDate: '',
    goalNotes: '',
    equipment: [],
    sessionMin: '',
    sessionMax: '',
    likedExercises: [],
    avoidedExercises: [],
    noUnassistedFreeBench: false,
    foodsLiked: [],
    foodsTolerated: [],
    foodsRefused: [],
  };
}

/**
 * Reconstruit un brouillon à partir de données relues (brouillon sauvegardé).
 * Les champs absents ou mal typés reprennent leur valeur vide.
 */
export function coerceDraft(value: unknown): ProfileDraft {
  const draft = emptyDraft();
  if (typeof value !== 'object' || value === null) return draft;
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(draft) as DraftField[]) {
    const current = draft[key];
    const candidate = source[key];
    if (Array.isArray(current)) {
      if (Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')) {
        (draft as unknown as Record<string, unknown>)[key] = [...candidate];
      }
    } else if (typeof candidate === typeof current) {
      (draft as unknown as Record<string, unknown>)[key] = candidate;
    }
  }
  if (draft.sex !== '' && !SEXES.includes(draft.sex)) draft.sex = '';
  if (draft.experience !== '' && !EXPERIENCE_LEVELS.includes(draft.experience)) draft.experience = '';
  if (draft.goalType !== '' && !GOAL_TYPES.includes(draft.goalType)) draft.goalType = '';
  draft.equipment = draft.equipment.filter((item) => EQUIPMENT.includes(item));
  return draft;
}

/** Prépare le formulaire de modification à partir d'un profil enregistré. */
export function profileToDraft(profile: Profile): ProfileDraft {
  return {
    firstName: profile.firstName ?? '',
    birthYear: String(profile.birthYear),
    sex: profile.sex,
    heightCm: formatDecimal(profile.heightCm),
    weightKg: '',
    experience: profile.experience,
    goalType: profile.goal.type,
    targetDate: profile.goal.targetDate,
    goalNotes: profile.goal.notes,
    equipment: [...profile.training.equipment],
    sessionMin: String(profile.training.sessionMinutes.min),
    sessionMax: String(profile.training.sessionMinutes.max),
    likedExercises: [...profile.training.likedExercises],
    avoidedExercises: [...profile.training.avoidedExercises],
    noUnassistedFreeBench: profile.training.noUnassistedFreeBench,
    foodsLiked: [...profile.foods.liked],
    foodsTolerated: [...profile.foods.tolerated],
    foodsRefused: [...profile.foods.refused],
  };
}

/** Lit un nombre décimal saisi au clavier français (« 58,5 ») ; `null` si invalide. */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export function formatDecimal(value: number): string {
  return String(value).replace('.', ',');
}

function parseInteger(input: string): number | null {
  const trimmed = input.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}

/** Nettoie un libellé (espaces superflus) ; renvoie '' s'il est vide. */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ');
}

/** Ajoute un libellé à une liste en évitant les doublons (insensible à la casse et aux accents). */
export function addTag(list: readonly string[], tag: string): string[] {
  const clean = normalizeTag(tag);
  if (!clean || list.some((item) => tagKey(item) === tagKey(clean))) return [...list];
  return [...list, clean];
}

export function tagKey(tag: string): string {
  return normalizeTag(tag)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Retire les erreurs des champs qui viennent d'être modifiés. */
export function clearErrors(errors: FieldErrors, fields: readonly string[]): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => !fields.includes(field))) as FieldErrors;
}

interface ValidationContext {
  /** Date du jour (injectée pour des tests déterministes). */
  today: IsoDate;
  /** Le poids initial n'est exigé qu'à la configuration. */
  requireWeight: boolean;
}

function validateTags(list: readonly string[], label: string): string | undefined {
  if (list.length > LIMITS.tagCount) return `${label} : ${LIMITS.tagCount} éléments maximum.`;
  const tooLong = list.find((tag) => tag.length > LIMITS.tagLength);
  if (tooLong) return `« ${tooLong.slice(0, 20)}… » dépasse ${LIMITS.tagLength} caractères.`;
  return undefined;
}

function findOverlap(a: readonly string[], b: readonly string[]): string | undefined {
  const keys = new Set(b.map(tagKey));
  return a.find((item) => keys.has(tagKey(item)));
}

export function validateSection(section: ProfileSection, draft: ProfileDraft, context: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  const currentYear = Number(context.today.slice(0, 4));

  switch (section) {
    case 'identity': {
      if (draft.firstName.trim().length > LIMITS.firstNameLength) {
        errors.firstName = `${LIMITS.firstNameLength} caractères maximum.`;
      }
      const birthYear = parseInteger(draft.birthYear);
      if (birthYear === null) {
        errors.birthYear = 'Indique ton année de naissance (ex. 2008).';
      } else {
        const age = currentYear - birthYear;
        if (age < LIMITS.minAge) errors.birthYear = `VYRO est prévu pour les ${LIMITS.minAge} ans et plus.`;
        else if (age > LIMITS.maxAge) errors.birthYear = 'Année de naissance invalide.';
      }
      if (!SEXES.includes(draft.sex as Sex)) errors.sex = 'Choisis une option.';
      const height = parseDecimal(draft.heightCm);
      if (height === null) errors.heightCm = 'Indique ta taille en centimètres (ex. 172).';
      else if (height < LIMITS.heightCm.min || height > LIMITS.heightCm.max) {
        errors.heightCm = `Taille attendue entre ${LIMITS.heightCm.min} et ${LIMITS.heightCm.max} cm.`;
      }
      if (context.requireWeight) {
        const weightError = validateWeight(draft.weightKg);
        if (weightError) errors.weightKg = weightError;
      }
      break;
    }
    case 'goal': {
      if (!EXPERIENCE_LEVELS.includes(draft.experience as ExperienceLevel)) errors.experience = 'Choisis ton expérience.';
      if (!GOAL_TYPES.includes(draft.goalType as GoalType)) errors.goalType = 'Choisis un objectif principal.';
      if (!isIsoDate(draft.targetDate)) {
        errors.targetDate = 'Choisis une date d’objectif.';
      } else if (draft.targetDate <= context.today) {
        errors.targetDate = 'La date d’objectif doit être dans le futur.';
      } else if (draft.targetDate > addYears(context.today, LIMITS.maxGoalYears)) {
        errors.targetDate = `Choisis une date dans les ${LIMITS.maxGoalYears} prochaines années.`;
      }
      if (draft.goalNotes.trim().length > LIMITS.notesLength) {
        errors.goalNotes = `${LIMITS.notesLength} caractères maximum.`;
      }
      break;
    }
    case 'training': {
      if (draft.equipment.some((item) => !EQUIPMENT.includes(item))) errors.equipment = 'Matériel inconnu.';
      const min = parseInteger(draft.sessionMin);
      const max = parseInteger(draft.sessionMax);
      const { min: low, max: high } = LIMITS.sessionMinutes;
      if (min === null || min < low || min > high) errors.sessionMin = `Entre ${low} et ${high} minutes.`;
      if (max === null || max < low || max > high) errors.sessionMax = `Entre ${low} et ${high} minutes.`;
      else if (min !== null && max < min) errors.sessionMax = 'La durée maximale doit être supérieure ou égale à la minimale.';

      const liked = validateTags(draft.likedExercises, 'Exercices aimés');
      if (liked) errors.likedExercises = liked;
      const avoided = validateTags(draft.avoidedExercises, 'Exercices à éviter');
      if (avoided) errors.avoidedExercises = avoided;
      const overlap = findOverlap(draft.likedExercises, draft.avoidedExercises);
      if (overlap) errors.avoidedExercises = `« ${overlap} » est à la fois aimé et à éviter.`;
      break;
    }
    case 'foods': {
      const lists = [
        ['foodsLiked', draft.foodsLiked, 'Aliments aimés'],
        ['foodsTolerated', draft.foodsTolerated, 'Aliments tolérés'],
        ['foodsRefused', draft.foodsRefused, 'Aliments refusés'],
      ] as const;
      for (const [field, list, label] of lists) {
        const error = validateTags(list, label);
        if (error) errors[field] = error;
      }
      const likedRefused = findOverlap(draft.foodsLiked, draft.foodsRefused);
      if (likedRefused) errors.foodsRefused = `« ${likedRefused} » est à la fois aimé et refusé.`;
      const toleratedRefused = findOverlap(draft.foodsTolerated, draft.foodsRefused);
      if (toleratedRefused) errors.foodsRefused = `« ${toleratedRefused} » est à la fois toléré et refusé.`;
      const likedTolerated = findOverlap(draft.foodsLiked, draft.foodsTolerated);
      if (likedTolerated) errors.foodsTolerated = `« ${likedTolerated} » est déjà dans les aliments aimés.`;
      break;
    }
  }
  return errors;
}

export function validateWeight(input: string): string | undefined {
  const weight = parseDecimal(input);
  if (weight === null) return 'Indique ton poids en kg (ex. 58 ou 58,5).';
  if (weight < LIMITS.weightKg.min || weight > LIMITS.weightKg.max) {
    return `Poids attendu entre ${LIMITS.weightKg.min} et ${LIMITS.weightKg.max} kg.`;
  }
  return undefined;
}

export function validateDraft(draft: ProfileDraft, context: ValidationContext): FieldErrors {
  return Object.assign({}, ...PROFILE_SECTIONS.map((section) => validateSection(section, draft, context))) as FieldErrors;
}

export class InvalidDraftError extends Error {
  constructor(readonly errors: FieldErrors) {
    super('Le profil contient des champs invalides.');
    this.name = 'InvalidDraftError';
  }
}

const cleanTags = (list: readonly string[]) => list.map(normalizeTag).filter(Boolean);

/** Partie du profil produite par chaque section du formulaire (brouillon supposé valide). */
const SECTION_BUILDERS = {
  identity: (draft: ProfileDraft) => ({
    firstName: normalizeTag(draft.firstName) || null,
    birthYear: Number(draft.birthYear.trim()),
    sex: draft.sex as Sex,
    heightCm: parseDecimal(draft.heightCm) as number,
  }),
  goal: (draft: ProfileDraft) => ({
    experience: draft.experience as ExperienceLevel,
    goal: { type: draft.goalType as GoalType, targetDate: draft.targetDate, notes: draft.goalNotes.trim() },
  }),
  training: (draft: ProfileDraft) => ({
    training: {
      equipment: EQUIPMENT.filter((item) => draft.equipment.includes(item)),
      sessionMinutes: { min: Number(draft.sessionMin.trim()), max: Number(draft.sessionMax.trim()) },
      likedExercises: cleanTags(draft.likedExercises),
      avoidedExercises: cleanTags(draft.avoidedExercises),
      noUnassistedFreeBench: draft.noUnassistedFreeBench,
    },
  }),
  foods: (draft: ProfileDraft) => ({
    foods: {
      liked: cleanTags(draft.foodsLiked),
      tolerated: cleanTags(draft.foodsTolerated),
      refused: cleanTags(draft.foodsRefused),
    },
  }),
} satisfies Record<ProfileSection, (draft: ProfileDraft) => Partial<Profile>>;

function throwIfInvalid(errors: FieldErrors): void {
  if (Object.keys(errors).length > 0) throw new InvalidDraftError(errors);
}

/**
 * Construit un profil complet à partir d'un brouillon valide.
 * Lève `InvalidDraftError` si un champ est invalide : rien n'est corrigé en silence.
 */
export function buildProfile(
  draft: ProfileDraft,
  context: ValidationContext & { now: string; createdAt?: string },
): Profile {
  throwIfInvalid(validateDraft(draft, context));
  return {
    id: 'me',
    ...SECTION_BUILDERS.identity(draft),
    ...SECTION_BUILDERS.goal(draft),
    ...SECTION_BUILDERS.training(draft),
    ...SECTION_BUILDERS.foods(draft),
    createdAt: context.createdAt ?? context.now,
    updatedAt: context.now,
  };
}

/**
 * Modifie une seule section d'un profil existant. Seule cette section est validée :
 * une date d'objectif dépassée n'empêche pas, par exemple, de changer ses aliments.
 */
export function updateProfileSection(
  profile: Profile,
  section: ProfileSection,
  draft: ProfileDraft,
  context: { today: IsoDate; now: string },
): Profile {
  throwIfInvalid(validateSection(section, draft, { today: context.today, requireWeight: false }));
  return { ...profile, ...SECTION_BUILDERS[section](draft), updatedAt: context.now };
}
