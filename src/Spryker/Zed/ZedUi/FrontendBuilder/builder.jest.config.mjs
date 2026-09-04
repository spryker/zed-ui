export default {
    displayName: 'merchant-portal-builder',
    rootDir: '.',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__tests__/**/*.test.mts', '<rootDir>/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['mts', 'ts', 'mjs', 'js', 'json'],
    extensionsToTreatAsEsm: ['.mts'],
    transform: {
        '^.+\\.mts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: '<rootDir>/tsconfig.json',
            },
        ],
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',
            },
        ],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.mts$': '$1',
        '^(\\.{1,2}/.*)\\.ts$': '$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
