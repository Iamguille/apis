require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  SESSION_DIR: process.env.SESSION_DIR || './sessions',
  SESSION_INACTIVE_TIMEOUT: process.env.SESSION_INACTIVE_TIMEOUT || 24 * 60 * 60 * 1000, // 24 horas de inactividad
  SESSION_CHECK_INTERVAL: process.env.SESSION_CHECK_INTERVAL || 60 * 60 * 1000, // Revisar cada hora
  BAILEYS_OPTIONS: {
    browser: ["Whatsapp API", "Chrome", "3.0.0"],
    markOnlineOnConnect: true,
    syncFullHistory: false,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    printQRInTerminal: true,
  }
};