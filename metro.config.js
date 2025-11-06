const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'ttf', 'otf'],
    platforms: ['ios', 'android', 'native', 'web'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
    blockList: [
      /\.DS_Store$/,
      /.*\/\.DS_Store$/,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  watchFolders: [],
  watchOptions: {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/android/build/**',
      '**/ios/build/**',
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
