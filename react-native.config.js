module.exports = {
  dependencies: {
    // Excluded: native .so caused startup crash on Android.
    // llamaService.ts handles absence gracefully via try/catch.
    'llama.rn': {
      platforms: { android: null, ios: null },
    },
    // Excluded: worklets 0.6.x requires New Architecture (disabled).
    'react-native-worklets': {
      platforms: { android: null, ios: null },
    },
  },
};
