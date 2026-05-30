module.exports = {
  dependencies: {
    // Excluded from autolinking so its native .so is not loaded at startup.
    // llamaService.ts handles the missing module gracefully via try/catch.
    'llama.rn': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
