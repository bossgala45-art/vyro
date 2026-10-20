import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { requestPersistentStorage } from '../../data/maintenance';
import { draftRepository } from '../../data/repositories/draftRepository';
import { ONBOARDING_DRAFT_ID, profileRepository } from '../../data/repositories/profileRepository';
import {
  InvalidDraftError,
  PROFILE_SECTIONS,
  SECTION_FIELDS,
  buildProfile,
  clearErrors,
  coerceDraft,
  emptyDraft,
  parseDecimal,
  validateSection,
  type FieldErrors,
  type ProfileDraft,
  type ProfileSection,
} from '../../domain/profile/draft';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { focusFirstError } from '../../ui/fields';
import { SECTION_TITLES, SectionFields } from '../profile/ProfileSectionFields';
import { ProfileSummary } from '../profile/ProfileSummary';

type Step = ProfileSection | 'summary';
const STEPS: readonly Step[] = [...PROFILE_SECTIONS, 'summary'];

const STEP_INTROS: Record<Step, string> = {
  identity: 'Quelques informations de base pour adapter ton programme.',
  goal: 'Ce que tu veux atteindre, et pour quand.',
  training: 'Ton matériel et tes préférences.',
  foods: 'Pour des idées de repas qui te plaisent vraiment.',
  summary: 'Vérifie tes informations avant de créer ton profil.',
};

interface SavedOnboarding {
  draft: unknown;
  step: unknown;
}

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loaded, setLoaded] = useState(false);
  const [draftWarning, setDraftWarning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const finished = useRef(false);

  const step = STEPS[stepIndex] ?? 'identity';
  const context = { today: todayIso(), requireWeight: true };

  // Reprise d'une configuration interrompue (app fermée en cours de saisie).
  useEffect(() => {
    let active = true;
    draftRepository
      .get(ONBOARDING_DRAFT_ID)
      .then((saved) => {
        if (!active || saved === undefined) return;
        const { draft: savedDraft, step: savedStep } = saved as SavedOnboarding;
        setDraft(coerceDraft(savedDraft));
        if (typeof savedStep === 'number' && savedStep >= 0 && savedStep < STEPS.length) setStepIndex(savedStep);
      })
      .catch(() => active && setDraftWarning(true))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  // Sauvegarde automatique du brouillon.
  useEffect(() => {
    if (!loaded || finished.current) return;
    const timer = window.setTimeout(() => {
      draftRepository
        .save(ONBOARDING_DRAFT_ID, { draft, step: stepIndex })
        .then(() => setDraftWarning(false))
        .catch(() => setDraftWarning(true));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, stepIndex, loaded]);

  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => clearErrors(current, Object.keys(patch)));
  };

  const goTo = (index: number) => {
    setErrors({});
    setSaveError(null);
    setStepIndex(index);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (step === 'summary') return;
    const sectionErrors = validateSection(step, draft, context);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      requestAnimationFrame(() => focusFirstError(SECTION_FIELDS[step], sectionErrors));
      return;
    }
    goTo(stepIndex + 1);
  };

  const back = () => (stepIndex === 0 ? navigate('/bienvenue') : goTo(stepIndex - 1));

  const create = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const now = nowIso();
      const profile = buildProfile(draft, { ...context, now });
      finished.current = true;
      await profileRepository.create(profile, {
        date: context.today,
        kg: parseDecimal(draft.weightKg) as number,
        createdAt: now,
      });
      void requestPersistentStorage();
      navigate('/', { replace: true });
    } catch (error) {
      finished.current = false;
      if (error instanceof InvalidDraftError) {
        const firstInvalid = PROFILE_SECTIONS.findIndex((section) =>
          SECTION_FIELDS[section].some((field) => error.errors[field]),
        );
        goTo(Math.max(firstInvalid, 0));
        setErrors(error.errors);
      } else {
        setSaveError(error instanceof StorageError ? error.message : 'Erreur inattendue : ton profil n’a pas été enregistré.');
      }
    } finally {
      setSaving(false);
    }
  };

  let summary: ReturnType<typeof buildProfile> | null = null;
  if (step === 'summary') {
    try {
      summary = buildProfile(draft, { ...context, now: nowIso() });
    } catch {
      summary = null;
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-ink-700/60 bg-ink-950/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            aria-label="Retour"
            className="-ml-2 grid size-11 place-items-center rounded-full text-mist active:text-snow"
          >
            <ChevronLeft aria-hidden size={24} />
          </button>
          <p className="text-sm text-mist">
            Étape {stepIndex + 1} sur {STEPS.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Progression de la configuration"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          className="mt-2 h-1 overflow-hidden rounded-full bg-ink-800"
        >
          <div
            className="h-full rounded-full bg-volt-500 transition-[width] duration-300"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <section key={step} aria-labelledby="onboarding-title" className="animate-screen-in flex-1 px-4 pt-6 pb-36">
        <h1 id="onboarding-title" className="font-display text-2xl font-bold text-snow">
          {step === 'summary' ? 'Récapitulatif' : SECTION_TITLES[step]}
        </h1>
        <p className="mt-1 text-sm text-mist">{STEP_INTROS[step]}</p>

        <div className="mt-6 space-y-4">
          {draftWarning && (
            <Alert tone="warning" title="Sauvegarde automatique indisponible">
              Ta saisie sera perdue si tu fermes VYRO avant la fin.
            </Alert>
          )}
          {step === 'summary' ? (
            summary && (
              <ProfileSummary
                profile={summary}
                initialWeightKg={parseDecimal(draft.weightKg) ?? undefined}
                renderEdit={(section, label) => (
                  <button
                    type="button"
                    onClick={() => goTo(STEPS.indexOf(section))}
                    aria-label={`Modifier : ${label}`}
                    className="min-h-11 px-2 text-sm font-medium text-volt-400"
                  >
                    Modifier
                  </button>
                )}
              />
            )
          ) : (
            <SectionFields section={step} draft={draft} errors={errors} onChange={update} askWeight />
          )}
          {step === 'summary' && (
            <Alert tone="info" title="Où vont tes données ?">
              Uniquement dans le stockage de Safari sur cet iPhone. Rien n’est envoyé à un serveur.
            </Alert>
          )}
          {saveError && (
            <Alert tone="error" title="Profil non enregistré">
              {saveError} Tes réponses sont toujours là : tu peux réessayer.
            </Alert>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ink-700/60 bg-ink-950/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          {step === 'summary' ? (
            <Button block busy={saving} onClick={() => void create()}>
              Créer mon profil
            </Button>
          ) : (
            <Button block onClick={next} disabled={!loaded}>
              Continuer
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
