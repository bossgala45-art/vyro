import { useEffect, useRef, useState } from 'react';
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router';
import { nowIso, todayIso } from '../../app/clock';
import { StorageError } from '../../data/errors';
import { useProfile } from '../../data/hooks';
import { profileRepository } from '../../data/repositories/profileRepository';
import {
  InvalidDraftError,
  PROFILE_SECTIONS,
  SECTION_FIELDS,
  clearErrors,
  profileToDraft,
  updateProfileSection,
  type FieldErrors,
  type ProfileDraft,
  type ProfileSection,
} from '../../domain/profile/draft';
import type { Profile } from '../../domain/profile/types';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { focusFirstError } from '../../ui/fields';
import { Screen } from '../../ui/Screen';
import { SECTION_TITLES, SectionFields } from './ProfileSectionFields';

const isSection = (value: string | undefined): value is ProfileSection =>
  PROFILE_SECTIONS.includes(value as ProfileSection);

export function ProfileEditScreen() {
  const { section } = useParams();
  const profile = useProfile();

  if (!isSection(section)) return <Navigate to="/profil" replace />;
  if (profile === undefined) return null;
  if (profile === null) return <Navigate to="/bienvenue" replace />;
  return <EditForm key={section} section={section} profile={profile} />;
}

function EditForm({ section, profile }: { section: ProfileSection; profile: Profile }) {
  const navigate = useNavigate();
  const initial = useRef(profileToDraft(profile));
  const [draft, setDraft] = useState<ProfileDraft>(initial.current);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = !saved && JSON.stringify(draft) !== JSON.stringify(initial.current);
  const blocker = useBlocker(dirty);

  // Rappel avant de quitter VYRO (fermeture ou rechargement) avec des modifications non enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (saved) navigate('/profil', { replace: true });
  }, [saved, navigate]);

  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => clearErrors(current, Object.keys(patch)));
  };

  const save = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const updated = updateProfileSection(profile, section, draft, { today: todayIso(), now: nowIso() });
      await profileRepository.update(updated);
      setSaved(true);
    } catch (error) {
      if (error instanceof InvalidDraftError) {
        setErrors(error.errors);
        requestAnimationFrame(() => focusFirstError(SECTION_FIELDS[section], error.errors));
      } else {
        setSaveError(error instanceof StorageError ? error.message : 'Erreur inattendue : rien n’a été enregistré.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={SECTION_TITLES[section]} subtitle="Modifier le profil">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-5"
      >
        <SectionFields section={section} draft={draft} errors={errors} onChange={update} />
        {saveError && (
          <Alert tone="error" title="Modifications non enregistrées">
            {saveError} Tes saisies sont conservées : tu peux réessayer.
          </Alert>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" busy={saving} className="flex-1">
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={() => navigate('/profil')}>
            Annuler
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Quitter sans enregistrer ?"
        confirmLabel="Quitter"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>Tes modifications seront perdues.</p>
      </ConfirmDialog>
    </Screen>
  );
}
