import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/renderRoute';
import { MORE_SECTIONS, TAB_SECTIONS, isMoreSectionPath, isTabActive } from './navigation';

const ALL_SECTIONS = [...TAB_SECTIONS, ...MORE_SECTIONS];

describe('configuration de la navigation', () => {
  it('a des chemins uniques', () => {
    const paths = ALL_SECTIONS.map((section) => section.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('garde 5 onglets au maximum pour l’iPhone', () => {
    expect(TAB_SECTIONS.length).toBeLessThanOrEqual(5);
  });

  it('rattache les modules secondaires à l’onglet « Plus »', () => {
    expect(isMoreSectionPath('/plus')).toBe(true);
    expect(isMoreSectionPath('/nutrition')).toBe(true);
    expect(isMoreSectionPath('/calendrier')).toBe(false);
    expect(isMoreSectionPath('/')).toBe(false);
    expect(isMoreSectionPath('/nutritionnel')).toBe(false);
  });

  it('active un seul onglet à la fois', () => {
    for (const pathname of ['/', '/calendrier', '/progres', '/coach', '/reglages']) {
      const active = TAB_SECTIONS.filter((tab) => isTabActive(tab.path, pathname));
      expect(active, pathname).toHaveLength(1);
    }
  });
});

describe('écrans', () => {
  it.each(ALL_SECTIONS.filter((section) => section.path !== '/'))('affiche l’écran $label', ({ path, label }) => {
    renderRoute(path);
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument();
  });

  it('affiche l’accueil avec le nom et le slogan', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', { level: 1, name: 'VYRO' })).toBeInTheDocument();
    expect(screen.getByText('BUILD YOUR BEST.')).toBeInTheDocument();
  });

  it('identifie clairement les modules non développés, sans données fictives', () => {
    renderRoute('/entrainement');
    expect(screen.getByText('Module en construction')).toBeInTheDocument();
    expect(screen.getByText('Prévu à l’étape 3 du développement')).toBeInTheDocument();
    expect(screen.getByText(/Aucune donnée n’est affichée/)).toBeInTheDocument();
  });

  it('affiche une page introuvable pour un chemin inconnu', () => {
    renderRoute('/nimporte-quoi');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
  });
});

describe('barre de navigation', () => {
  it('navigue entre les onglets', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });

    await user.click(within(nav).getByRole('link', { name: 'Calendrier' }));
    expect(router.state.location.pathname).toBe('/calendrier');
    expect(screen.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Calendrier' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('link', { name: 'Aujourd’hui' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('ouvre un module secondaire depuis « Plus » en gardant l’onglet actif', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/plus');

    const moreMenu = screen.getByRole('navigation', { name: 'Autres modules' });
    await user.click(within(moreMenu).getByRole('link', { name: /Nutrition/ }));

    expect(router.state.location.pathname).toBe('/nutrition');
    expect(screen.getByRole('heading', { level: 1, name: 'Nutrition' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('link', { name: 'Plus' })).toHaveAttribute('aria-current', 'page');
  });
});
