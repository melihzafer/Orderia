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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.after-env.js'],
  // Ekran testleri gerçek bir bellek içi veritabanı üstünde çalışıyor. Varsayılan
  // 5 sn, `asyncUtilTimeout` ile aynı olduğu için başarısız bir sorgu kendi
  // mesajını basamadan jest zaman aşımına düşüyordu; pencere aralarını ayırır.
  testTimeout: 20_000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Metro `.svg`'yi bileşene çeviriyor (metro.config.js), jest çevirmiyor.
    '\\.svg$': '<rootDir>/src/test-support/svgMock.tsx',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*.(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
};
