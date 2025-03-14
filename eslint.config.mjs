import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import json from '@eslint/json';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    tseslint.configs.recommended,
    stylistic.configs.customize({
        commaDangle: 'only-multiline',
        indent: 4,
        quotes: 'single',
        semi: true,
        jsx: true,
    }),
    {
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: json,
        rules: {
            '@typescript-eslint/array-type': ['warn', { default: 'generic' }]
        }
    },
);
