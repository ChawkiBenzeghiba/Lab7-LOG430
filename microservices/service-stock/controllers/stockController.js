const StockCentral = require('../models/StockCentral');
const Produit = require('../models/Produit');
const Magasin = require('../models/Magasin');

const stockController = {
  // Créer un magasin
  async createMagasin(req, res) {
    try {
      const { nom, adresse, ville, codePostal, pays } = req.body;

      if (!nom) {
        return res.status(400).json({
          error: 'Le nom du magasin est obligatoire'
        });
      }

      const magasin = await Magasin.create({
        nom,
        adresse,
        ville,
        codePostal,
        pays: pays || 'Canada',
        inventaire: {}
      });

      res.status(201).json({
        success: true,
        data: magasin,
        message: 'Magasin créé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la création du magasin:', error);
      res.status(500).json({
        error: 'Erreur lors de la création du magasin'
      });
    }
  },
  // Afficher le stock central
  async afficherStock(req, res) {
    try {
      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({ 
          error: 'Stock central introuvable' 
        });
      }

      // Pagination
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const { count, rows: produits } = await Produit.findAndCountAll({ 
        limit, 
        offset,
        where: { actif: true }
      });
      
      const inventaire = stock.inventaire;

      const stockListe = produits.map(p => ({
        id: p.id,
        nom: p.nom,
        description: p.description,
        prix: p.prix,
        categorie: p.categorie,
        codeProduit: p.codeProduit,
        quantite: inventaire[p.id] || 0
      }));

      res.json({ 
        success: true,
        total: count, 
        produits: stockListe,
        inventaire: inventaire
      });
    } catch (error) {
      console.error('Erreur lors de l\'affichage du stock:', error);
      res.status(500).json({ 
        error: 'Erreur lors de l\'affichage du stock' 
      });
    }
  },

  // Retirer du stock central (réapprovisionnement magasin)
  async retirerDuStock(req, res) {
    try {
      const { magasinId } = req.params;
      const { produitId, quantiteDemandee } = req.body;

      // Validation des données
      if (!produitId || !quantiteDemandee) {
        return res.status(400).json({
          error: 'ProduitId et quantiteDemandee sont obligatoires'
        });
      }

      if (quantiteDemandee <= 0) {
        return res.status(400).json({
          error: 'La quantité demandée doit être supérieure à 0'
        });
      }

      // Récupérer le stock central
      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({
          error: 'Stock central introuvable'
        });
      }

      const inventaire = stock.inventaire;
      const dispo = inventaire[produitId] || 0;

      // Vérifier la disponibilité
      if (quantiteDemandee > dispo) {
        return res.status(400).json({
          error: `Stock insuffisant : demandé ${quantiteDemandee}, disponible ${dispo}`
        });
      }

      // Mettre à jour le stock central
      inventaire[produitId] = dispo - quantiteDemandee;
      stock.changed('inventaire', true);
      await stock.save();

      // Mettre à jour l'inventaire du magasin
      const magasin = await Magasin.findByPk(magasinId);
      if (!magasin) {
        return res.status(404).json({ 
          error: 'Magasin introuvable' 
        });
      }
      
      const invMag = magasin.inventaire || {};
      invMag[produitId] = (invMag[produitId] || 0) + quantiteDemandee;
      magasin.inventaire = invMag;
      magasin.changed('inventaire', true);
      await magasin.save();

      res.json({
        success: true,
        message: `Réapprovisionnement de ${quantiteDemandee} unités OK`,
        nouvelleQuantite: stock.inventaire[produitId],
        inventaire: stock.inventaire,
        magasin: {
          id: magasin.id,
          nom: magasin.nom,
          inventaire: magasin.inventaire
        }
      });
    } catch (error) {
      console.error('Erreur reapprovisionnement:', error);
      res.status(500).json({ 
        error: 'Erreur lors du réapprovisionnement' 
      });
    }
  },

  // Ajouter du stock central
  async ajouterStock(req, res) {
    try {
      const { produitId, quantite } = req.body;

      if (!produitId || !quantite) {
        return res.status(400).json({
          error: 'ProduitId et quantite sont obligatoires'
        });
      }

      if (quantite <= 0) {
        return res.status(400).json({
          error: 'La quantité doit être supérieure à 0'
        });
      }

      // Récupérer ou créer le stock central
      let stock = await StockCentral.findOne();
      if (!stock) {
        stock = await StockCentral.create({ inventaire: {} });
      }

      const inventaire = stock.inventaire;
      inventaire[produitId] = (inventaire[produitId] || 0) + quantite;
      
      stock.changed('inventaire', true);
      await stock.save();

      res.json({
        success: true,
        message: `${quantite} unités ajoutées au stock`,
        nouvelleQuantite: inventaire[produitId],
        inventaire: inventaire
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de stock:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'ajout de stock'
      });
    }
  },

  // Diminuer le stock d'un produit
  async diminuerStock(req, res) {
    try {
      const { produitId, quantite } = req.body;

      if (!produitId || !quantite) {
        return res.status(400).json({
          error: 'ProduitId et quantite sont obligatoires'
        });
      }

      if (quantite <= 0) {
        return res.status(400).json({
          error: 'La quantité doit être supérieure à 0'
        });
      }

      // Récupérer le stock central
      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({
          error: 'Stock central introuvable'
        });
      }

      const inventaire = stock.inventaire;
      const stockActuel = inventaire[produitId] || 0;

      if (stockActuel < quantite) {
        return res.status(400).json({
          error: `Stock insuffisant: demandé ${quantite}, disponible ${stockActuel}`
        });
      }

      // Diminuer le stock
      inventaire[produitId] = stockActuel - quantite;
      stock.changed('inventaire', true);
      await stock.save();

      res.json({
        success: true,
        message: `${quantite} unités retirées du stock`,
        nouvelleQuantite: inventaire[produitId],
        produitId
      });
    } catch (error) {
      console.error('Erreur lors de la diminution du stock:', error);
      res.status(500).json({
        error: 'Erreur lors de la diminution du stock'
      });
    }
  },

  // Récupérer l'inventaire d'un magasin
  async getInventaireMagasin(req, res) {
    try {
      const { magasinId } = req.params;

      const magasin = await Magasin.findByPk(magasinId);
      if (!magasin) {
        return res.status(404).json({
          error: 'Magasin introuvable'
        });
      }

      const inventaire = magasin.inventaire || {};

      // Récupérer les détails des produits
      const produitsIds = Object.keys(inventaire);
      const produits = await Produit.findAll({
        where: {
          id: produitsIds,
          actif: true
        }
      });

      const inventaireDetaille = produits.map(p => ({
        id: p.id,
        nom: p.nom,
        description: p.description,
        prix: p.prix,
        categorie: p.categorie,
        codeProduit: p.codeProduit,
        quantite: inventaire[p.id] || 0
      }));

      res.json({
        success: true,
        magasin: {
          id: magasin.id,
          nom: magasin.nom,
          adresse: magasin.adresse
        },
        inventaire: inventaireDetaille,
        total: inventaireDetaille.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inventaire:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'inventaire'
      });
    }
  },

  // Vérifier la disponibilité du stock pour une commande
  async verifierStock(req, res) {
    try {
      const { produits } = req.body;

      if (!produits || !Array.isArray(produits)) {
        return res.status(400).json({
          error: 'Liste de produits requise'
        });
      }

      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({
          error: 'Stock central introuvable'
        });
      }

      const inventaire = stock.inventaire;
      const resultats = [];

      for (const produit of produits) {
        const { produitId, quantite } = produit;
        const stockDisponible = inventaire[produitId] || 0;
        const disponible = stockDisponible >= quantite;

        resultats.push({
          produitId,
          quantiteDemandee: quantite,
          stockDisponible,
          disponible
        });
      }

      const tousDisponibles = resultats.every(r => r.disponible);

      res.json({
        disponible: tousDisponibles,
        resultats,
        message: tousDisponibles ? 'Tous les produits sont disponibles' : 'Certains produits ne sont pas disponibles'
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du stock:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification du stock'
      });
    }
  },

  // Réserver du stock pour une commande
  async reserverStock(req, res) {
    try {
      const { commandeId, produits } = req.body;

      if (!commandeId || !produits || !Array.isArray(produits)) {
        return res.status(400).json({
          error: 'CommandeId et liste de produits requis'
        });
      }

      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({
          error: 'Stock central introuvable'
        });
      }

      const inventaire = stock.inventaire;
      const reservations = [];

      // Vérifier d'abord que tout est disponible
      for (const produit of produits) {
        const { produitId, quantite } = produit;
        const stockDisponible = inventaire[produitId] || 0;

        if (stockDisponible < quantite) {
          return res.status(400).json({
            error: `Stock insuffisant pour le produit ${produitId}: demandé ${quantite}, disponible ${stockDisponible}`
          });
        }
      }

      // Réserver le stock
      for (const produit of produits) {
        const { produitId, quantite } = produit;
        const stockActuel = inventaire[produitId] || 0;
        
        inventaire[produitId] = stockActuel - quantite;
        
        reservations.push({
          produitId,
          quantiteReservee: quantite,
          nouvelleQuantite: inventaire[produitId]
        });
      }

      stock.changed('inventaire', true);
      await stock.save();

      res.json({
        success: true,
        commandeId,
        message: 'Stock réservé avec succès',
        reservations
      });
    } catch (error) {
      console.error('Erreur lors de la réservation du stock:', error);
      res.status(500).json({
        error: 'Erreur lors de la réservation du stock'
      });
    }
  },

  // Libérer du stock réservé (compensation)
  async libererStock(req, res) {
    try {
      const { commandeId } = req.body;

      if (!commandeId) {
        return res.status(400).json({
          error: 'CommandeId requis'
        });
      }

      // Pour simplifier, on libère un montant fixe
      // En production, on devrait récupérer les détails de la commande
      const stock = await StockCentral.findOne();
      if (!stock) {
        return res.status(404).json({
          error: 'Stock central introuvable'
        });
      }

      // Simulation de libération de stock
      // En réalité, on devrait récupérer les produits de la commande
      res.json({
        success: true,
        commandeId,
        message: 'Stock libéré avec succès',
        note: 'Libération simulée - en production, récupérer les détails de la commande'
      });
    } catch (error) {
      console.error('Erreur lors de la libération du stock:', error);
      res.status(500).json({
        error: 'Erreur lors de la libération du stock'
      });
    }
  }
};

module.exports = stockController; 