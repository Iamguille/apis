const { activeSessions } = require('../services/whatsappService');
const logger = require('../utils/logger');

/**
 * Middleware para validar la existencia de la API key
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.params.apiKey;
  
  if (!apiKey) {
    logger.warn('Solicitud rechazada: API key no proporcionada');
    return res.status(401).json({ 
      success: false, 
      error: 'Se requiere una API key' 
    });
  }
  
  // No validamos la existencia de la sesión aquí,
  // eso se maneja en cada controlador según sea necesario
  next();
};

/**
 * Middleware para validar que la sesión esté activa
 */
const validateActiveSession = (req, res, next) => {
  const apiKey = req.params.apiKey;
  const session = activeSessions.get(apiKey);
  
  if (!session) {
    logger.warn(`Solicitud rechazada: Sesión ${apiKey} no encontrada`);
    return res.status(404).json({ 
      success: false, 
      error: 'Sesión no encontrada' 
    });
  }
  
  if (!session.connectionReady) {
    logger.warn(`Solicitud rechazada: Sesión ${apiKey} no conectada`);
    return res.status(503).json({ 
      success: false, 
      error: 'El cliente de WhatsApp no está conectado' 
    });
  }
  
  // Actualizar última actividad
  session.lastActivity = Date.now();
  next();
};

module.exports = {
  validateApiKey,
  validateActiveSession
};