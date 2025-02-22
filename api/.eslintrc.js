module.exports = {
    extends: ['@unicorn'],
    plugins: ['prettier', 'import'],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                'quote-props': ['warn', 'as-needed'],
                '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
                'react/display-name': 'off',
                // https://github.com/typescript-eslint/typescript-eslint/blob/main/docs/linting/TROUBLESHOOTING.md#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
                'no-undef': 'off',
                'no-multiple-empty-lines': ['error', { max: 1 }],
                // https://medium.com/weekly-webtips/how-to-sort-imports-like-a-pro-in-typescript-4ee8afd7258a
                'import/order': [
                    'error',
                    {
                        groups: [
                            'builtin', // Built-in imports (come from NodeJS native) go first
                            'external', // <- External imports
                            'internal', // <- Absolute imports
                            ['sibling', 'parent'], // <- Relative imports, the sibling and parent types they can be mingled together
                            'index', // <- index imports
                            'unknown' // <- unknown
                        ],
                        'newlines-between': 'always'
                    }
                ],
                'no-mixed-spaces-and-tabs': ['error', 'smart-tabs']
            }
        }
    ]
};
