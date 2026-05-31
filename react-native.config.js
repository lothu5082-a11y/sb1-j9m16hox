module.exports = {
  dependencies: {
    // Excluded: librnllama.so is too large and crashes on startup via JNI.
    // llamaService.ts handles the missing module gracefully via try/catch.
    'llama.rn': {
      platforms: { android: null, ios: null },
    },
    // react-native-worklets: intentionally NOT excluded here.
    // Reanimated 4.x requires :react-native-worklets as a Gradle subproject
    // at build time and links libworklets.so into libreanimated.so at link time.
    // Excluding worklets breaks the Gradle build with a GradleException from
    // reanimated's build.gradle.
  },
};
