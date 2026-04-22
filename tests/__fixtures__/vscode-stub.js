// Minimal stub of the 'vscode' module for unit tests that need to load
// compiled extension code.  Only exports the surface area actually
// referenced at module load time by files under test.
module.exports = {
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
};
