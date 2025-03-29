const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Genera una clave API aleatoria
 * @returns {string} - Clave API generada
 */
const generateApiKey = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Formatea un número para WhatsApp
 * @param {string} number - Número a formatear
 * @returns {string} - Número formateado
 */
const formatPhoneNumber = (number) => {
  if (!number) return null;
  
  if (number.includes('@')) {
    return number;
  }
  
  // Eliminar caracteres no numéricos
  const cleanNumber = number.replace(/[^\d]/g, '');
  return `${cleanNumber}@s.whatsapp.net`;
};

/**
 * Crea el directorio de sesiones si no existe
 */
const ensureSessionDir = () => {
  if (!fs.existsSync(config.SESSION_DIR)) {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });
  }
};

/**
 * Verifica si una sesión existe en disco
 * @param {string} apiKey - Clave API de la sesión
 * @returns {boolean} - Verdadero si la sesión existe
 */
const sessionExists = (apiKey) => {
  const sessionPath = path.join(config.SESSION_DIR, apiKey);
  return fs.existsSync(sessionPath) && fs.statSync(sessionPath).isDirectory();
};

/**
 * Elimina una sesión del disco
 * @param {string} apiKey - Clave API de la sesión
 */
const removeSessionDir = (apiKey) => {
  const sessionPath = path.join(config.SESSION_DIR, apiKey);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true });
  }
};

module.exports = {
  generateApiKey,
  formatPhoneNumber,
  ensureSessionDir,
  sessionExists,
  removeSessionDir
};