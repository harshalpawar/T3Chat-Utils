let devMode = true;

class Logger {
  setDevMode(mode) {
    devMode = mode;
  }

  log(message, type = "INFO") {
    if (!devMode) return;
    const prefix = "[SidekickChat]";
    if (type === "ERROR") {
      console.error(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  error(message) {
    this.log(message, true);
  }
}

const logger = new Logger();
export default logger;
