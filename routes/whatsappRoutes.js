const express = require('express');
const { validateApiKey, validateActiveSession } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorMiddleware');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

// Endpoints públicos (no requieren API key)
router.post('/create-session', asyncHandler(whatsappController.createSession));

// Endpoints que requieren API key
router.get('/session-status/:apiKey', validateApiKey, asyncHandler(whatsappController.getSessionStatus));
router.delete('/close-session/:apiKey', validateApiKey, asyncHandler(whatsappController.closeSession));

// Endpoints que requieren sesión activa
router.post('/send-message/:apiKey', 
  validateApiKey, 
  asyncHandler(whatsappController.sendMessage)
);

router.post('/send-pdf/:apiKey', 
  validateApiKey, 
  asyncHandler(whatsappController.sendPdf)
);

module.exports = router;