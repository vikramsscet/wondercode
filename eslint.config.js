import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['apps/api/**/*.js', '*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Core rule can't see JSX usage, so capitalised names (components) are exempt.
      'no-unused-vars': ['error', { argsIgnorePattern: '^[_A-Z]', varsIgnorePattern: '^[A-Z]' }],
    },
  },
  {
    files: ['apps/web/**/*.test.{js,jsx}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
];
