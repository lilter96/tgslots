import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', '**/dist/**', '**/*.compiled.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            unknown: 'Avoid `unknown`. Use a specific type instead.',
            never: 'Avoid `never`. Use `void` for absent sides of Either/Result types.',
          },
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  prettier,
)
