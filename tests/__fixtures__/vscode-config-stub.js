let values = {};

function setConfigValues(nextValues) {
  values = { ...nextValues };
}

module.exports = {
  __setConfigValues: setConfigValues,
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => (key in values ? values[key] : defaultValue),
    }),
  },
};
