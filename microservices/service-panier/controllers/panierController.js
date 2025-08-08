const Panier = require('../models/Panier');
const { Op } = require('sequelize');
const axios = require('axios');

const panierController = {
  // Ajouter un produit au panier
  async ajouterProduit(req, res) {
    try {
      const { clientId } = req.params;
      const { produitId, quantite, prixUnitaire } = req.body;

      // Validation des données
      if (!produitId || !prixUnitaire) {
        return res.status(400).json({
          error: 'ProduitId et prixUnitaire sont obligatoires'
        });
      }

      if (prixUnitaire <= 0) {
        return res.status(400).json({
          error: 'Le prix unitaire doit être supérieur à 0'
        });
      }

      const qte = quantite || 1;
      if (qte <= 0) {
        return res.status(400).json({
          error: 'La quantite doit être supérieure à 0'
        });
      }

      // Vérifier le stock disponible
      try {
        const stockResponse = await axios.get(`http://service-stock:3003/api/stock/stock-central`);
        const stockData = stockResponse.data;
        const stockDisponible = stockData.inventaire[produitId] || 0;

        if (stockDisponible < qte) {
          return res.status(400).json({
            error: `Stock insuffisant: demandé ${qte}, disponible ${stockDisponible}`,
            stockDisponible
          });
        }
      } catch (stockError) {
        console.error('Erreur lors de la vérification du stock:', stockError);
        return res.status(500).json({
          error: 'Erreur lors de la vérification du stock'
        });
      }

      // Vérifier si le produit est déjà dans le panier
      const panierExistant = await Panier.findOne({
        where: {
          clientId: parseInt(clientId),
          produitId,
          actif: true
        }
      });

      if (panierExistant) {
        // Vérifier le stock pour la nouvelle quantité totale
        const nouvelleQuantite = panierExistant.quantite + qte;
        
        try {
          const stockResponse = await axios.get(`http://service-stock:3003/api/stock/stock-central`);
          const stockData = stockResponse.data;
          const stockDisponible = stockData.inventaire[produitId] || 0;

          if (stockDisponible < nouvelleQuantite) {
            return res.status(400).json({
              error: `Stock insuffisant pour la quantité totale: demandé ${nouvelleQuantite}, disponible ${stockDisponible}`,
              stockDisponible
            });
          }
        } catch (stockError) {
          console.error('Erreur lors de la vérification du stock:', stockError);
          return res.status(500).json({
            error: 'Erreur lors de la vérification du stock'
          });
        }

        // Diminuer le stock
        try {
          await axios.post(`http://service-stock:3003/api/stock/stock-central/diminuer`, {
            produitId,
            quantite: qte
          });
        } catch (stockError) {
          console.error('Erreur lors de la diminution du stock:', stockError);
          return res.status(500).json({
            error: 'Erreur lors de la mise à jour du stock'
          });
        }

        // Mettre à jour la quantité
        const nouveauPrixTotal = nouvelleQuantite * prixUnitaire;

        await panierExistant.update({
          quantite: nouvelleQuantite,
          prixTotal: nouveauPrixTotal
        });

        return res.json({
          success: true,
          data: panierExistant,
          message: 'Quantité mise à jour dans le panier'
        });
      }

      // Diminuer le stock pour le nouveau produit
      try {
        await axios.post(`http://service-stock:3003/api/stock/stock-central/diminuer`, {
          produitId,
          quantite: qte
        });
      } catch (stockError) {
        console.error('Erreur lors de la diminution du stock:', stockError);
        return res.status(500).json({
          error: 'Erreur lors de la mise à jour du stock'
        });
      }

      // Ajouter le nouveau produit
      const prixTotal = qte * prixUnitaire;
      const panier = await Panier.create({
        clientId: parseInt(clientId),
        produitId,
        quantite: qte,
        prixUnitaire,
        prixTotal
      });

      res.status(201).json({
        success: true,
        data: panier,
        message: 'Produit ajouté au panier'
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'ajout au panier'
      });
    }
  },

  // Supprimer un produit du panier
  async supprimerProduit(req, res) {
    try {
      const { clientId, produitId } = req.params;

      const panier = await Panier.findOne({
        where: {
          clientId: parseInt(clientId),
          produitId: parseInt(produitId),
          actif: true
        }
      });

      if (!panier) {
        return res.status(404).json({
          error: 'Produit non trouvé dans le panier'
        });
      }

      await panier.update({ actif: false });

      res.json({
        success: true,
        message: 'Produit supprimé du panier'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du panier:', error);
      res.status(500).json({
        error: 'Erreur lors de la suppression du panier'
      });
    }
  },

  // Modifier la quantité d'un produit
  async modifierQuantite(req, res) {
    try {
      const { clientId, produitId } = req.params;
      const { quantite } = req.body;

      if (!quantite || quantite <= 0) {
        return res.status(400).json({
          error: 'La quantite doit être supérieure à 0'
        });
      }

      const panier = await Panier.findOne({
        where: {
          clientId: parseInt(clientId),
          produitId: parseInt(produitId),
          actif: true
        }
      });

      if (!panier) {
        return res.status(404).json({
          error: 'Produit non trouvé dans le panier'
        });
      }

      const nouveauPrixTotal = quantite * panier.prixUnitaire;

      await panier.update({
        quantite,
        prixTotal: nouveauPrixTotal
      });

      res.json({
        success: true,
        data: panier,
        message: 'Quantité mise à jour'
      });
    } catch (error) {
      console.error('Erreur lors de la modification de la quantité:', error);
      res.status(500).json({
        error: 'Erreur lors de la modification de la quantité'
      });
    }
  },

  // Récupérer le panier d'un client
  async getPanier(req, res) {
    try {
      const { clientId } = req.params;

      const panier = await Panier.findAll({
        where: {
          clientId: parseInt(clientId),
          actif: true
        },
        order: [['dateAjout', 'DESC']]
      });

      // Calculer le total du panier
      const totalPanier = panier.reduce((total, item) => {
        return total + parseFloat(item.prixTotal);
      }, 0);

      res.json({
        success: true,
        data: {
          items: panier,
          total: totalPanier,
          count: panier.length
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du panier:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du panier'
      });
    }
  },

  // Vider le panier
  async viderPanier(req, res) {
    try {
      const { clientId } = req.params;

      await Panier.update(
        { actif: false },
        {
          where: {
            clientId: parseInt(clientId),
            actif: true
          }
        }
      );

      res.json({
        success: true,
        message: 'Panier vidé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors du vidage du panier:', error);
      res.status(500).json({
        error: 'Erreur lors du vidage du panier'
      });
    }
  }
};

module.exports = panierController; 