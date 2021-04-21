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
    collectCoverage: true,
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
            setupFiles: ['./tests/variants/prod.js'],
            ...baseConfig,
        },
        {
            displayName: 'dev',
            setupFiles: ['./tests/variants/dev.js'],
            ...baseConfig,
        },
        {
            displayName: 'check',
            setupFiles: ['./tests/variants/check.js'],
            ...baseConfig,
        },
    ],
};

export default process.env.TEST === 'FULL' ? fullConfig : baseConfig;
