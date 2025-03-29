const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');
const whatsappRoutes = require('./routes/whatsappRoutes');
const whatsappService = require('./services/whatsappService');
const { ensureSessionDir } = require('./utils/helpers');

// Inicializar la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.get('/', (req, res) => {
  res.send('API de WhatsApp con Baileys (Multisesión) funcionando correctamente');
});

// Rutas de la API de WhatsApp
app.use('/api/whatsapp', whatsappRoutes);

// Middleware de manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar el servidor
app.listen(config.PORT, async () => {
  logger.info(`Servidor API de WhatsApp (Multisesión) iniciado en el puerto ${config.PORT}`);

  // Asegurar directorio de sesiones
  ensureSessionDir();

  // Cargar sesiones existentes
  await whatsappService.loadExistingSessions();
  
  // Iniciar limpiador de sesiones
  whatsappService.startSessionCleaner();
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
});