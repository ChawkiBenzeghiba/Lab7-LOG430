const express = require('express');
const router = express.Router();
const commandeController = require('../controllers/commandeController');

// Valider une commande (check-out)
router.post('/client/:clientId/valider', commandeController.validerCommande);

// Récupérer une commande par ID
router.get('/:id', commandeController.getCommandeById);

// Récupérer les commandes d'un client
router.get('/client/:clientId', commandeController.getCommandesByClient);

// Mettre à jour le statut d'une commande
router.put('/:id/statut', commandeController.updateStatutCommande);

// Annuler une commande
router.delete('/:id/annuler', commandeController.annulerCommande);

// Endpoint pour la saga orchestrée
router.put('/:id/etat', commandeController.updateEtatCommande);

module.exports = router; 