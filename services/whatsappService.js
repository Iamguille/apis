const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    delay,
  } = require('@whiskeysockets/baileys');
  const { Boom } = require('@hapi/boom');
  const path = require('path');
  const fs = require('fs');
  const config = require('../config/config');
  const logger = require('../utils/logger');
  const { sessionExists, removeSessionDir } = require('../utils/helpers');
  
  // Almacenamiento de sesiones activas
  const activeSessions = new Map();
  
  /**
   * Configura y conecta un cliente de WhatsApp
   * @param {string} apiKey - Clave API de la sesión
   * @param {boolean} isReconnecting - Indica si se está reconectando
   * @returns {Object} - Objeto de sesión
   */
  const connectToWhatsApp = async (apiKey, isReconnecting = false) => {
    try {
      const authDir = path.join(config.SESSION_DIR, apiKey);
      if (!fs.existsSync(authDir)) {
        if (isReconnecting) {
          throw new Error('Directorio de sesión no encontrado');
        }
        fs.mkdirSync(authDir, { recursive: true });
      }
  
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
  
      const client = makeWASocket({
        ...config.BAILEYS_OPTIONS,
        auth: state,
        logger,
        getMessage: async () => ({}),
      });
  
      // Guardar las credenciales cuando hay cambios
      client.ev.on('creds.update', saveCreds);
  
      // Manejar la conexión
      client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const session = activeSessions.get(apiKey) || {};
  
        if (qr) {
          logger.info(`QR Code generado para sesión ${apiKey}`);
          session.qr = qr;
          session.lastActivity = Date.now();
          activeSessions.set(apiKey, session);
        }
  
        if (connection === 'close') {
          const shouldReconnect =
            lastDisconnect?.error instanceof Boom &&
            lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
  
          logger.info(
            `Conexión cerrada para sesión ${apiKey}, reconectando: ${shouldReconnect}`
          );
  
          if (shouldReconnect) {
            await delay(5000);
            await connectToWhatsApp(apiKey, true);
          } else {
            session.connectionReady = false;
            activeSessions.set(apiKey, session);
            logger.info(`Sesión ${apiKey} cerrada, escanea el código QR nuevamente`);
          }
        } else if (connection === 'open') {
          session.connectionReady = true;
          session.qr = null;
          session.client = client;
          session.lastActivity = Date.now();
          activeSessions.set(apiKey, session);
          logger.info(`Conexión establecida con éxito para sesión ${apiKey}`);
        }
      });
  
      // Almacenar la sesión
      activeSessions.set(apiKey, {
        client,
        qr: null,
        connectionReady: false,
        lastActivity: Date.now(),
      });
  
      return activeSessions.get(apiKey);
    } catch (error) {
      logger.error(`Error en la conexión de WhatsApp para sesión ${apiKey}:`, error);
      throw error;
    }
  };
  
  /**
   * Obtiene una sesión activa o intenta reconectarla
   * @param {string} apiKey - Clave API de la sesión
   * @returns {Object} - Objeto de sesión
   */
  const getSession = async (apiKey) => {
    let session = activeSessions.get(apiKey);
  
    // Si no hay sesión activa pero existe el directorio, intentar reconectar
    if (!session && sessionExists(apiKey)) {
      try {
        session = await connectToWhatsApp(apiKey, true);
      } catch (error) {
        logger.error(`Error al reconectar sesión ${apiKey}:`, error);
        throw error;
      }
    }
  
    return session;
  };
  
  /**
   * Carga sesiones existentes al iniciar
   */
  const loadExistingSessions = async () => {
    if (!fs.existsSync(config.SESSION_DIR)) {
      fs.mkdirSync(config.SESSION_DIR, { recursive: true });
      return;
    }
  
    const sessionDirs = fs.readdirSync(config.SESSION_DIR);
    for (const dir of sessionDirs) {
      const sessionPath = path.join(config.SESSION_DIR, dir);
      if (fs.statSync(sessionPath).isDirectory()) {
        try {
          logger.info(`Cargando sesión existente: ${dir}`);
          await connectToWhatsApp(dir, true);
        } catch (error) {
          logger.error(`Error al cargar sesión ${dir}:`, error);
        }
      }
    }
  };
  
  /**
   * Inicia un limpiador de sesiones inactivas
   */
  const startSessionCleaner = () => {
    setInterval(() => {
      const now = Date.now();
  
      for (const [apiKey, session] of activeSessions.entries()) {
        if (now - session.lastActivity > config.SESSION_INACTIVE_TIMEOUT) {
          logger.info(`Cerrando sesión inactiva: ${apiKey}`);
          session.client?.end();
          activeSessions.delete(apiKey);
  
          // Eliminar directorio de sesión
          removeSessionDir(apiKey);
        }
      }
    }, config.SESSION_CHECK_INTERVAL);
  };
  
  /**
   * Envía un mensaje de texto
   * @param {string} apiKey - Clave API de la sesión
   * @param {string} number - Número al que enviar
   * @param {string} message - Mensaje a enviar
   * @returns {Object} - Respuesta de WhatsApp
   */
  const sendTextMessage = async (apiKey, number, message) => {
    const session = await getSession(apiKey);
  
    if (!session || !session.client) {
      throw new Error('Sesión no encontrada');
    }
  
    if (!session.connectionReady) {
      throw new Error('Cliente de WhatsApp no está conectado');
    }
  
    // Verificar si el número existe en WhatsApp
    const [result] = await session.client.onWhatsApp(number);
    if (!result || !result.exists) {
      throw new Error('El número no existe en WhatsApp');
    }
  
    // Enviar el mensaje
    const response = await session.client.sendMessage(number, {
      text: message,
    });
  
    // Actualizar última actividad
    session.lastActivity = Date.now();
    activeSessions.set(apiKey, session);
  
    return response;
  };
  
  /**
   * Envía un archivo PDF
   * @param {string} apiKey - Clave API de la sesión
   * @param {string} number - Número al que enviar
   * @param {string} pdfUrl - URL del PDF
   * @param {string} message - Mensaje opcional
   * @returns {Object} - Respuesta de WhatsApp
   */
  const sendPdfMessage = async (apiKey, number, pdfUrl, message) => {
    const session = await getSession(apiKey);
  
    if (!session || !session.client) {
      throw new Error('Sesión no encontrada');
    }
  
    if (!session.connectionReady) {
      throw new Error('Cliente de WhatsApp no está conectado');
    }
  
    // Enviar el PDF
    const response = await session.client.sendMessage(number, {
      document: { url: pdfUrl },
      mimetype: 'application/pdf',
      fileName: 'documento.pdf',
      caption: message || '',
    });
  
    // Actualizar última actividad
    session.lastActivity = Date.now();
    activeSessions.set(apiKey, session);
  
    return response;
  };
  
  /**
   * Cierra una sesión
   * @param {string} apiKey - Clave API de la sesión
   */
  const closeSession = async (apiKey) => {
    const session = activeSessions.get(apiKey);
  
    if (session) {
      await session.client.end();
      activeSessions.delete(apiKey);
    }
  };
  
  module.exports = {
    activeSessions,
    connectToWhatsApp,
    getSession,
    loadExistingSessions,
    startSessionCleaner,
    sendTextMessage,
    sendPdfMessage,
    closeSession,
  };