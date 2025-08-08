const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panierController');

// Ajouter un produit au panier
router.post('/client/:clientId/ajouter', panierController.ajouterProduit);

// Supprimer un produit du panier
router.delete('/client/:clientId/produit/:produitId', panierController.supprimerProduit);

// Modifier la quantité d'un produit
router.put('/client/:clientId/produit/:produitId/quantite', panierController.modifierQuantite);

// Récupérer le panier d'un client
router.get('/client/:clientId', panierController.getPanier);

// Vider le panier
router.delete('/client/:clientId/vider', panierController.viderPanier);

module.exports = router; 