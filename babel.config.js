module.exports = function (api) {
  const isTest = api.env('test');

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          web: {
            unstable_transformProfile: 'hermes-stable',
          },
        },
      ],
    ],
    plugins: [
      './babel-plugin-transform-import-meta.js',
      isTest && 'babel-plugin-dynamic-import-node',
      'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};
