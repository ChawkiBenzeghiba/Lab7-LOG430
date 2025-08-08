const Produit = require('../models/Produit');
const { Op } = require('sequelize');

const produitController = {
  // Récupérer tous les produits d'un magasin
  async getProduitsByMagasin(req, res) {
    try {
      const { magasinId } = req.params;
      
      const whereConditions = {
        actif: true
      };

      if (magasinId && !isNaN(magasinId)) {
        whereConditions.magasinId = parseInt(magasinId);
      }

      const produits = await Produit.findAll({
        where: whereConditions,
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: produits,
        count: produits.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des produits' 
      });
    }
  },

  // Rechercher un produit
  async rechercherProduit(req, res) {
    try {
      const { magasinId } = req.params;
      const { q, categorie, prixMin, prixMax } = req.query;

      // Si pas de magasinId dans les paramètres, on cherche dans tous les magasins
      const whereConditions = {
        actif: true
      };

      if (magasinId && !isNaN(magasinId)) {
        whereConditions.magasinId = parseInt(magasinId);
      }

      // Recherche par nom ou description
      if (q) {
        whereConditions[Op.or] = [
          { nom: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
          { codeProduit: { [Op.iLike]: `%${q}%` } }
        ];
      }

      // Filtre par catégorie
      if (categorie) {
        whereConditions.categorie = categorie;
      }

      // Filtre par prix
      if (prixMin || prixMax) {
        whereConditions.prix = {};
        if (prixMin) whereConditions.prix[Op.gte] = parseFloat(prixMin);
        if (prixMax) whereConditions.prix[Op.lte] = parseFloat(prixMax);
      }

      const produits = await Produit.findAll({
        where: whereConditions,
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: produits,
        count: produits.length,
        filters: { q, categorie, prixMin, prixMax }
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de produits:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche de produits' 
      });
    }
  },

  // Récupérer un produit par ID
  async getProduitById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          error: 'ID du produit invalide' 
        });
      }

      const produit = await Produit.findByPk(id);

      if (!produit) {
        return res.status(404).json({ 
          error: 'Produit non trouvé' 
        });
      }

      res.json({
        success: true,
        data: produit
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du produit:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération du produit' 
      });
    }
  },

  // Créer un nouveau produit
  async createProduit(req, res) {
    try {
      const { nom, description, prix, categorie, codeProduit, magasinId } = req.body;

      // Validation des données
      if (!nom || !prix || !categorie) {
        return res.status(400).json({ 
          error: 'Nom, prix et catégorie sont obligatoires' 
        });
      }

      if (prix <= 0) {
        return res.status(400).json({ 
          error: 'Le prix doit être supérieur à 0' 
        });
      }

      // Générer un code produit automatiquement s'il n'est pas fourni
      const finalCodeProduit = codeProduit || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Vérifier si le code produit existe déjà
      const existingProduit = await Produit.findOne({
        where: { codeProduit: finalCodeProduit }
      });

      if (existingProduit) {
        return res.status(409).json({ 
          error: 'Un produit avec ce code existe déjà' 
        });
      }

      const produit = await Produit.create({
        nom,
        description,
        prix,
        categorie,
        codeProduit: finalCodeProduit,
        magasinId: magasinId || 1
      });

      res.status(201).json({
        success: true,
        data: produit,
        message: 'Produit créé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la création du produit' 
      });
    }
  }
};

module.exports = produitController; 