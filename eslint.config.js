import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Test files can use 'any' for mocks and test utilities
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Service and utility files can use 'any' for flexibility
    files: ['src/services/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Context files can export both components and hooks/utilities
    files: ['**/*-context.tsx', '**/*Context.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Dialog and UI components can use 'any' for flexibility with form handlers
    files: [
      'src/components/dialogs/**/*.tsx',
      'src/components/ui/**/*.tsx',
      'src/hooks/**/*.ts',
      'src/pages/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_', // Ignore unused parameters starting with underscore
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
])
