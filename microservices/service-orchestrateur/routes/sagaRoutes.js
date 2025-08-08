const express = require('express');
const sagaController = require('../controllers/sagaController');

const router = express.Router();

// Route principale pour démarrer une saga
router.post('/commande', sagaController.demarrerSaga);

// Route pour obtenir une saga spécifique
router.get('/:sagaId', sagaController.obtenirSaga);

// Route pour obtenir toutes les sagas d'une commande
router.get('/commande/:commandeId', sagaController.obtenirSagasParCommande);

// Route pour obtenir les statistiques
router.get('/stats/statistiques', sagaController.obtenirStatistiques);

// Route pour obtenir les sagas récentes
router.get('/stats/recentes', sagaController.obtenirSagasRecentes);

module.exports = router;
