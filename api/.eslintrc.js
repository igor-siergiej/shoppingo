export const plugins = ['prettier', 'import'];
export const overrides = [
    {
        files: ['*.ts', '*.tsx'],
        rules: {
            'quote-props': ['warn', 'as-needed'],
            '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
            'react/display-name': 'off',
            'no-undef': 'off',
            'no-multiple-empty-lines': ['error', { max: 1 }],
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
];
