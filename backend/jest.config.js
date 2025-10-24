module.exports = {
    moduleFileExtensions: [ 'js', 'json', 'ts' ],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: [ '**/*.(t|j)s' ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/config/(.*)$': '<rootDir>/src/config/$1',
        '^@/common/(.*)$': '<rootDir>/src/common/$1',
        '^@/core/(.*)$': '<rootDir>/src/core/$1',
        '^@/modules/(.*)$': '<rootDir>/src/modules/$1',
    },
};

