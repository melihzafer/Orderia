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
    files: ['jest.setup.js', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
]);
