const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// Créer un magasin
router.post('/magasins', stockController.createMagasin);

// Afficher le stock central
router.get('/stock-central', stockController.afficherStock);

// Retirer du stock central (réapprovisionnement magasin)
router.post('/magasin/:magasinId/reapprovisionnement', stockController.retirerDuStock);

// Ajouter du stock central
router.post('/stock-central/ajouter', stockController.ajouterStock);

// Diminuer le stock d'un produit (pour le panier)
router.post('/stock-central/diminuer', stockController.diminuerStock);

// Récupérer l'inventaire d'un magasin
router.get('/magasin/:magasinId/inventaire', stockController.getInventaireMagasin);

// Endpoints pour la saga orchestrée
router.post('/verifier', stockController.verifierStock);
router.post('/reserver', stockController.reserverStock);
router.post('/liberer', stockController.libererStock);

module.exports = router; 