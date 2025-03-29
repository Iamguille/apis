/**
 * Módulo logger personalizado con diferentes niveles de log
 */
const logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };
  
  // Obtener el nivel de log del entorno o usar ERROR como default
  const currentLevel = process.env.LOG_LEVEL ? 
    (logLevels[process.env.LOG_LEVEL.toUpperCase()] || logLevels.ERROR) : 
    logLevels.ERROR;
  
  const logger = {
    error: (message, ...args) => {
      if (currentLevel >= logLevels.ERROR) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
      }
    },
    warn: (message, ...args) => {
      if (currentLevel >= logLevels.WARN) {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
      }
    },
    info: (message, ...args) => {
      if (currentLevel >= logLevels.INFO) {
        console.info(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
      }
    },
    debug: (message, ...args) => {
      if (currentLevel >= logLevels.DEBUG) {
        console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
      }
    },
    trace: (message, ...args) => {
      if (currentLevel >= logLevels.TRACE) {
        console.trace(`[TRACE] ${new Date().toISOString()}: ${message}`, ...args);
      }
    },
    child: () => logger, // Para compatibilidad con Baileys
  };
  
  module.exports = logger;