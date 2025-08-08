const Vente = require('../models/Vente');
const { Op } = require('sequelize');

const venteController = {
  // Enregistrer une vente
  async enregistrerVente(req, res) {
    try {
      const { magasinId } = req.params;
      const { produitId, quantite, prixUnitaire } = req.body;

      // Validation des données
      if (!produitId || !quantite || !prixUnitaire) {
        return res.status(400).json({
          error: 'ProduitId, quantite et prixUnitaire sont obligatoires'
        });
      }

      if (quantite <= 0) {
        return res.status(400).json({
          error: 'La quantite doit être supérieure à 0'
        });
      }

      if (prixUnitaire <= 0) {
        return res.status(400).json({
          error: 'Le prix unitaire doit être supérieur à 0'
        });
      }

      // Calculer le prix total
      const prixTotal = quantite * prixUnitaire;

      // Créer la vente
      const vente = await Vente.create({
        magasinId: parseInt(magasinId),
        produitId,
        quantite,
        prixUnitaire,
        prixTotal,
        type: 'vente',
        statut: 'terminee'
      });

      res.status(201).json({
        success: true,
        data: vente,
        message: 'Vente enregistrée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la vente:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'enregistrement de la vente'
      });
    }
  },

  // Faire un retour
  async faireRetour(req, res) {
    try {
      const { magasinId } = req.params;
      const { venteId, raison } = req.body;

      if (!venteId) {
        return res.status(400).json({
          error: 'VenteId est obligatoire'
        });
      }

      // Trouver la vente originale
      const venteOriginale = await Vente.findByPk(venteId);

      if (!venteOriginale) {
        return res.status(404).json({
          error: 'Vente non trouvée'
        });
      }

      if (venteOriginale.magasinId !== parseInt(magasinId)) {
        return res.status(403).json({
          error: 'Cette vente n\'appartient pas à ce magasin'
        });
      }

      // Créer le retour
      const retour = await Vente.create({
        magasinId: parseInt(magasinId),
        produitId: venteOriginale.produitId,
        quantite: venteOriginale.quantite,
        prixUnitaire: venteOriginale.prixUnitaire,
        prixTotal: venteOriginale.prixTotal,
        type: 'retour',
        statut: 'terminee'
      });

      res.status(201).json({
        success: true,
        data: retour,
        message: 'Retour enregistré avec succès'
      });
    } catch (error) {
      console.error('Erreur lors du retour:', error);
      res.status(500).json({
        error: 'Erreur lors du retour'
      });
    }
  },

  // Récupérer les ventes d'un magasin
  async getVentesByMagasin(req, res) {
    try {
      const { magasinId } = req.params;
      const { type, dateDebut, dateFin } = req.query;

      const whereConditions = {
        magasinId: parseInt(magasinId)
      };

      if (type) {
        whereConditions.type = type;
      }

      if (dateDebut || dateFin) {
        whereConditions.dateVente = {};
        if (dateDebut) whereConditions.dateVente[Op.gte] = new Date(dateDebut);
        if (dateFin) whereConditions.dateVente[Op.lte] = new Date(dateFin);
      }

      const ventes = await Vente.findAll({
        where: whereConditions,
        order: [['dateVente', 'DESC']]
      });

      res.json({
        success: true,
        data: ventes,
        count: ventes.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des ventes:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des ventes'
      });
    }
  },

  // Récupérer une vente par ID
  async getVenteById(req, res) {
    try {
      const { id } = req.params;

      const vente = await Vente.findByPk(id);

      if (!vente) {
        return res.status(404).json({
          error: 'Vente non trouvée'
        });
      }

      res.json({
        success: true,
        data: vente
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la vente:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de la vente'
      });
    }
  },

  // Traiter un paiement pour la saga
  async traiterPaiement(req, res) {
    try {
      const { commandeId, montant, methodePaiement } = req.body;

      if (!commandeId || !montant || !methodePaiement) {
        return res.status(400).json({
          error: 'CommandeId, montant et methodePaiement sont obligatoires'
        });
      }

      if (montant <= 0) {
        return res.status(400).json({
          error: 'Le montant doit être supérieur à 0'
        });
      }

      // Règle déterministe pour les tests : échouer si montant >= 5000
      if (Number(montant) >= 5000) {
        return res.status(400).json({
          error: 'Paiement refusé',
          commandeId,
          montant,
          methodePaiement,
          cause: 'Montant trop élevé (règle de test)'
        });
      }

      // Enregistrer un "paiement" comme une vente liée à la commande
      const paiement = await Vente.create({
        magasinId: 1,
        produitId: 0, // Sentinel numérique pour opérations financières
        quantite: 1,
        prixUnitaire: montant,
        prixTotal: montant,
        type: 'vente', // rester sur l'ENUM existant
        statut: 'terminee',
        commandeId: commandeId
      });

      res.json({
        success: true,
        message: 'Paiement traité avec succès',
        commandeId,
        montant,
        methodePaiement,
        transactionId: paiement.id
      });
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement du paiement'
      });
    }
  },

  // Annuler un paiement (compensation)
  async annulerPaiement(req, res) {
    try {
      const { commandeId } = req.body;

      if (!commandeId) {
        return res.status(400).json({
          error: 'CommandeId requis'
        });
      }

      // Trouver un enregistrement lié à la commande (si existant)
      const paiement = await Vente.findOne({
        where: {
          commandeId: commandeId
        }
      });

      if (paiement) {
        // Enregistrer un "remboursement" comme un retour
        const remboursement = await Vente.create({
          magasinId: paiement.magasinId,
          produitId: 0,
          quantite: 1,
          prixUnitaire: paiement.prixUnitaire,
          prixTotal: paiement.prixUnitaire,
          type: 'retour',
          statut: 'terminee',
          commandeId: commandeId
        });

        return res.json({
          success: true,
          message: 'Paiement annulé avec succès',
          commandeId,
          montantRembourse: paiement.prixUnitaire,
          remboursementId: remboursement.id
        });
      }

      // Aucun paiement réel enregistré : considérer la compensation comme réussie
      return res.json({
        success: true,
        message: 'Aucun paiement trouvé pour cette commande (rien à annuler)',
        commandeId
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation du paiement:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'annulation du paiement'
      });
    }
  }
};

module.exports = venteController; 