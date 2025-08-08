const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');

// Récupérer tous les produits d'un magasin
router.get('/magasin/:magasinId', produitController.getProduitsByMagasin);

// Récupérer tous les produits (sans magasin spécifique)
router.get('/', produitController.getProduitsByMagasin);

// Rechercher des produits
router.get('/magasin/:magasinId/search', produitController.rechercherProduit);

// Recherche globale (sans magasin spécifique)
router.get('/recherche', produitController.rechercherProduit);

// Récupérer un produit par ID
router.get('/:id', produitController.getProduitById);

// Créer un nouveau produit
router.post('/', produitController.createProduit);

module.exports = router; 