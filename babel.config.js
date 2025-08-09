module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', {
        web: {
          unstable_transformProfile: 'hermes-stable'
        }
      }]
    ],
    plugins: [
      "nativewind/babel",
      "./babel-plugin-transform-import-meta.js",
      "react-native-reanimated/plugin"
    ],
  };
};
