import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', '.netlify', 'scripts/local-validation'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        { selector: "Literal[value=/SERVICE_ROLE/]", message: 'La service role no puede aparecer en código cliente.' },
      ],
    },
  },
  {
    // Solo servidor y scripts pueden mencionar la service role.
    files: ['netlify/**', 'scripts/**', 'tests/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
