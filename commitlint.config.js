module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Customize rules if needed
        'type-enum': [
            2,
            'always',
            [
                'feat', // New feature (triggers MINOR version bump)
                'fix', // Bug fix (triggers PATCH version bump)
                'docs', // Documentation only changes
                'style', // Code style changes (formatting, etc.)
                'refactor', // Code refactoring
                'perf', // Performance improvements
                'test', // Adding or updating tests
                'build', // Build system changes
                'ci', // CI/CD configuration changes
                'chore', // Other changes that don't modify src
                'revert', // Revert a previous commit
            ],
        ],
    },
};
