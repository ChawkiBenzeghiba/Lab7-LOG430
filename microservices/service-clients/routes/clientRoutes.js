const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// Créer un nouveau compte client
router.post('/register', clientController.createClient);

// Récupérer tous les clients
router.get('/', clientController.getAllClients);

// Authentifier un client
router.post('/login', clientController.authenticateClient);

// Récupérer un client par ID
router.get('/:id', clientController.getClientById);

// Mettre à jour un client
router.put('/:id', clientController.updateClient);

// Désactiver un client
router.delete('/:id', clientController.deactivateClient);

module.exports = router; 