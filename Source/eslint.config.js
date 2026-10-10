import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

export default defineConfig([
  {
    files: ['src/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        chrome: true,
        HaloUI: true,
        HaloOnboarding: true,
        HaloWave: true,
        HaloUpdates: true,
        HaloLocalUpdate: true,
        HaloBilibili: true,
        HaloVideo: true,
        cookieStore: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    plugins: {
      js,
    },
    extends: ['js/recommended'],
    rules: {
      'no-unused-vars': 'warn',
      'no-unreachable': 'warn',
      'no-irregular-whitespace': ['error', { skipTemplates: true }],
      'require-await': 'error',
      'no-empty': 'off',
    },
  },
]);
