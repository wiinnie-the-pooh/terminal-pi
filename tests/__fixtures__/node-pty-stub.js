let onDataHandler = () => {};
let onExitHandler = () => {};

const calls = { spawn: [], write: [], resize: [], kill: [] };

const stub = {
  spawn(file, args, opts) {
    calls.spawn.push({ file, args, opts });
    return {
      onData(handler) { onDataHandler = handler; return { dispose: () => {} }; },
      onExit(handler) { onExitHandler = handler; return { dispose: () => {} }; },
      write(data) { calls.write.push(data); },
      resize(cols, rows) { calls.resize.push({ cols, rows }); },
      kill() { calls.kill.push(true); },
    };
  },
  __simulateData(data) { onDataHandler(data); },
  __simulateExit(exitCode) { onExitHandler({ exitCode }); },
  __calls: calls,
  __reset() {
    onDataHandler = () => {};
    onExitHandler = () => {};
    calls.spawn = [];
    calls.write = [];
    calls.resize = [];
    calls.kill = [];
  },
};

module.exports = stub;
