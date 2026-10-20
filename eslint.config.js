import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Le moteur sportif reste pur : pas d'interface, pas d'accès direct au stockage.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react-router'], message: 'Le domaine ne dépend pas de l’interface.' },
            { group: ['**/data/**', 'dexie'], message: 'Le domaine ne dépend pas du stockage.' },
            { group: ['**/features/**', '**/ui/**', '**/app/**'], message: 'Le domaine ne dépend pas de l’interface.' },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
