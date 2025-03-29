const whatsappService = require('../services/whatsappService');
const { generateApiKey, formatPhoneNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Crear nueva sesión o reconectar una existente
 */
const createSession = async (req, res) => {
  try {
    const { apiKey } = req.body;

    // Si se proporciona una apiKey, intentar reconectar
    if (apiKey) {
      try {
        const session = await whatsappService.getSession(apiKey);
        if (session) {
          return res.status(200).json({
            success: true,
            apiKey,
            qr: session.qr,
            message: 'Reconectando sesión existente',
          });
        }
      } catch (error) {
        logger.error(`Error al reconectar sesión ${apiKey}:`, error);
      }
    }

    // Crear nueva sesión
    const newApiKey = generateApiKey();
    const session = await whatsappService.connectToWhatsApp(newApiKey);

    res.status(201).json({
      success: true,
      apiKey: newApiKey,
      qr: session.qr,
      message: 'Nueva sesión creada. Escanea el código QR para conectar.',
    });
  } catch (error) {
    logger.error('Error al crear/reconectar sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Obtener estado de sesión y QR
 */
const getSessionStatus = async (req, res) => {
  try {
    const { apiKey } = req.params;
    let session;
    
    try {
      session = await whatsappService.getSession(apiKey);
    } catch (error) {
      logger.error(`Error al obtener/reconectar sesión ${apiKey}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener la sesión: ' + error.message,
      });
    }

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sesión no encontrada' 
      });
    }

    res.status(200).json({
      success: true,
      status: session.connectionReady ? 'conectado' : 'desconectado',
      qr: session.qr,
      lastActivity: session.lastActivity,
    });
  } catch (error) {
    logger.error('Error al obtener estado de sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Enviar mensaje de texto
 */
const sendMessage = async (req, res) => {
  try {
    const { apiKey } = req.params;
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Número y mensaje son obligatorios' 
      });
    }

    const formattedNumber = formatPhoneNumber(number);
    
    const response = await whatsappService.sendTextMessage(
      apiKey, 
      formattedNumber, 
      message
    );

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      details: response,
    });
  } catch (error) {
    logger.error('Error al enviar mensaje:', error);
    res.status(error.message.includes('no existe') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Enviar archivo PDF
 */
const sendPdf = async (req, res) => {
  try {
    const { apiKey } = req.params;
    const { number, pdfUrl, message } = req.body;

    if (!number || !pdfUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Número y URL del PDF son obligatorios' 
      });
    }

    const formattedNumber = formatPhoneNumber(number);
    
    const response = await whatsappService.sendPdfMessage(
      apiKey, 
      formattedNumber, 
      pdfUrl, 
      message
    );

    res.status(200).json({
      success: true,
      message: 'PDF enviado correctamente',
      details: response,
    });
  } catch (error) {
    logger.error('Error al enviar PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Cerrar sesión
 */
const closeSession = async (req, res) => {
  try {
    const { apiKey } = req.params;
    
    await whatsappService.closeSession(apiKey);

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  } catch (error) {
    logger.error('Error al cerrar sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createSession,
  getSessionStatus,
  sendMessage,
  sendPdf,
  closeSession,
};