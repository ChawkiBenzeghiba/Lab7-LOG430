const Commande = require('../models/Commande');
const CommandeItem = require('../models/CommandeItem');
const axios = require('axios');

const commandeController = {
  // Valider une commande (check-out)
  async validerCommande(req, res) {
    try {
      const { clientId } = req.params;
      const { 
        items, 
        adresseLivraison, 
        adresseFacturation, 
        methodePaiement,
        notes 
      } = req.body;

      // Validation des données
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'La commande doit contenir au moins un article'
        });
      }

      if (!adresseLivraison || !adresseFacturation || !methodePaiement) {
        return res.status(400).json({
          error: 'Adresse de livraison, facturation et méthode de paiement sont obligatoires'
        });
      }

      // Calculer le montant total
      const montantTotal = items.reduce((total, item) => {
        return total + (item.prixUnitaire * item.quantite);
      }, 0);

      // Générer un numéro de commande unique
      const numeroCommande = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Créer la commande
      const commande = await Commande.create({
        clientId: parseInt(clientId),
        numeroCommande,
        montantTotal,
        adresseLivraison,
        adresseFacturation,
        methodePaiement,
        notes,
        statut: 'en_attente'
      });

      // Créer les items de la commande
      const commandeItems = await Promise.all(
        items.map(item => 
          CommandeItem.create({
            commandeId: commande.id,
            produitId: item.produitId,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            prixTotal: item.prixUnitaire * item.quantite
          })
        )
      );

      // Vider le panier après validation de la commande
      try {
        await axios.delete(`http://service-panier:3006/api/panier/client/${clientId}/vider`);
        console.log(`Panier vidé pour le client ${clientId} après validation de la commande ${commande.id}`);
      } catch (panierError) {
        console.error('Erreur lors du vidage du panier:', panierError);
        // On ne fait pas échouer la commande si le vidage du panier échoue
      }

      res.status(201).json({
        success: true,
        data: {
          commande,
          items: commandeItems
        },
        message: 'Commande validée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la validation de la commande:', error);
      res.status(500).json({
        error: 'Erreur lors de la validation de la commande'
      });
    }
  },

  // Récupérer une commande par ID
  async getCommandeById(req, res) {
    try {
      const { id } = req.params;

      const commande = await Commande.findByPk(id, {
        include: [{
          model: CommandeItem,
          as: 'items'
        }]
      });

      if (!commande) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        });
      }

      res.json({
        success: true,
        data: commande
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la commande:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de la commande'
      });
    }
  },

  // Récupérer les commandes d'un client
  async getCommandesByClient(req, res) {
    try {
      const { clientId } = req.params;
      const { statut } = req.query;

      const whereConditions = {
        clientId: parseInt(clientId)
      };

      if (statut) {
        whereConditions.statut = statut;
      }

      const commandes = await Commande.findAll({
        where: whereConditions,
        include: [{
          model: CommandeItem,
          as: 'items'
        }],
        order: [['dateCommande', 'DESC']]
      });

      res.json({
        success: true,
        data: commandes,
        count: commandes.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des commandes'
      });
    }
  },

  // Mettre à jour le statut d'une commande
  async updateStatutCommande(req, res) {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      if (!statut) {
        return res.status(400).json({
          error: 'Le statut est obligatoire'
        });
      }

      const commande = await Commande.findByPk(id);

      if (!commande) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        });
      }

      await commande.update({ statut });

      res.json({
        success: true,
        data: commande,
        message: 'Statut de la commande mis à jour'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du statut'
      });
    }
  },

  // Annuler une commande
  async annulerCommande(req, res) {
    try {
      const { id } = req.params;

      const commande = await Commande.findByPk(id);

      if (!commande) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        });
      }

      if (commande.statut === 'livree') {
        return res.status(400).json({
          error: 'Impossible d\'annuler une commande déjà livrée'
        });
      }

      await commande.update({ statut: 'annulee' });

      res.json({
        success: true,
        message: 'Commande annulée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation de la commande:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'annulation de la commande'
      });
    }
  },

  // Mettre à jour l'état d'une commande pour la saga
  async updateEtatCommande(req, res) {
    try {
      const { id } = req.params;
      const { etat } = req.body;

      if (!etat) {
        return res.status(400).json({
          error: 'L\'état est obligatoire'
        });
      }

      const commande = await Commande.findByPk(id);

      if (!commande) {
        return res.status(404).json({
          error: 'Commande non trouvée'
        });
      }

      // Mapper les états de saga vers les statuts de commande
      let statut;
      switch (etat) {
        case 'CONFIRMEE':
          statut = 'confirmee';
          break;
        case 'ANNULEE':
          statut = 'annulee';
          break;
        case 'EN_ERREUR':
          statut = 'en_erreur';
          break;
        default:
          statut = 'en_attente';
      }

      await commande.update({ statut });

      res.json({
        success: true,
        data: commande,
        message: `État de la commande mis à jour: ${etat}`,
        etat: etat,
        statut: statut
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'état:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de l\'état'
      });
    }
  }
};

module.exports = commandeController; 