export const commonConfig = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
    moduleFileExtensions: ['js', 'ts'],
};

const config = {
    collectCoverage: true,
    coverageDirectory: '../coverage',
    projects: [
        {
            displayName: 'prod',
            setupFiles: ['./variants/prod.js'],
            ...commonConfig,
        },
        {
            displayName: 'dev',
            setupFiles: ['./variants/dev.js'],
            ...commonConfig,
        },
        {
            displayName: 'check',
            setupFiles: ['./variants/check.js'],
            ...commonConfig,
        },
    ],
};

export default config;
