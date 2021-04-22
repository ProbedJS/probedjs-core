const baseConfig = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
    moduleFileExtensions: ['js', 'ts'],
};

const fullConfig = {
    collectCoverage: !!process.env.COVERAGE,
    coverageDirectory: './coverage',
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    projects: [
        {
            displayName: 'prod',
            setupFiles: ['./tests/setup/prod.js'],
            ...baseConfig,
        },
        {
            displayName: 'dev',
            setupFiles: ['./tests/setup/dev.js'],
            ...baseConfig,
        },
        {
            displayName: 'check',
            setupFiles: ['./tests/setup/check.js'],
            ...baseConfig,
        },
    ],
};

export default process.env.TEST === 'FULL' ? fullConfig : baseConfig;
