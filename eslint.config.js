const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores([
    '.expo/**',
    'android/**',
    'coverage/**',
    'dist/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    // OpenWolf tarafından üretilir ve güncellenir; projenin biçim/lint
    // kurallarına tabi değil.
    '.wolf/**',
  ]),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['*.config.js', '*.config.ts', '*.cjs', 'babel-*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Edge function'lar Deno'da kosar; jsr:/npm:/https: belirteclerini
    // Node cozumleyicisi bulamaz, bu beklenen bir durumdur.
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: globals.deno,
    },
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    // Derleme ve CI betikleri Node'da kosar; Expo'nun derleme aninda
    // gomdugu env kurali burada gecerli degildir.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'expo/no-dynamic-env-var': 'off',
    },
  },
  {
    files: [
      'jest.setup.js',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*.contract.{ts,tsx}',
      '**/*Contract.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
]);
