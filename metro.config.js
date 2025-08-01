const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 2. Enable SVG support
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// Fix import.meta issues for React 18 web compatibility
config.resolver.unstable_enableSymlinks = true;
config.transformer.unstable_allowRequireContext = true;

// Add path aliases with absolute paths for better platform compatibility
const aliases = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/screens': path.resolve(__dirname, 'src/screens'),
  '@/stores': path.resolve(__dirname, 'src/stores'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/constants': path.resolve(__dirname, 'src/constants'),
  '@/contexts': path.resolve(__dirname, 'src/contexts'),
  '@/navigation': path.resolve(__dirname, 'src/navigation'),
};

// Ensure aliases work for all platforms
config.resolver.alias = aliases;
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;

