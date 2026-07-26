module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/i18n/languages.ts',
  ],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*.(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
};
