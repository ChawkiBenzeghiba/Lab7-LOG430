const sagaOrchestrator = require('../services/sagaOrchestrator');
const { Saga } = require('../models');
const logger = require('../utils/logger');

class SagaController {
  async demarrerSaga(req, res) {
    try {
      const { commandeId, produits, montant, methodePaiement, clientId } = req.body;

      // Validation des données
      if (!commandeId || !produits || !montant || !methodePaiement || !clientId) {
        return res.status(400).json({
          error: 'Données manquantes',
          required: ['commandeId', 'produits', 'montant', 'methodePaiement', 'clientId']
        });
      }

      const commandeData = {
        id: commandeId,
        produits,
        montant,
        methodePaiement,
        clientId
      };

      logger.info('Démarrage d\'une nouvelle saga', { commandeId });

      const resultat = await sagaOrchestrator.demarrerSaga(commandeData);

      res.status(200).json({
        message: 'Saga démarrée avec succès',
        sagaId: resultat.sagaId,
        etat: resultat.etat,
        commandeId
      });

    } catch (error) {
      logger.error('Erreur lors du démarrage de la saga:', error);

      // Tenter de récupérer la dernière saga liée à cette commande pour exposer son id/état
      let sagaInfo = {};
      try {
        const commandeId = req.body?.commandeId;
        if (commandeId) {
          const lastSaga = await Saga.findOne({
            where: { commandeId },
            order: [['createdAt', 'DESC']]
          });
          if (lastSaga) {
            sagaInfo = { sagaId: lastSaga.id, etat: lastSaga.etat };
          }
        }
      } catch (e) {
        // ignore lookup errors
      }
      
      res.status(500).json({
        error: 'Erreur lors du démarrage de la saga',
        message: error.message,
        commandeId: req.body.commandeId,
        ...sagaInfo
      });
    }
  }

  async obtenirSaga(req, res) {
    try {
      const { sagaId } = req.params;

      const saga = await sagaOrchestrator.obtenirSaga(sagaId);

      if (!saga) {
        return res.status(404).json({
          error: 'Saga non trouvée',
          sagaId
        });
      }

      res.status(200).json({
        saga: {
          id: saga.id,
          commandeId: saga.commandeId,
          etat: saga.etat,
          etapeCourante: saga.etapeCourante,
          etapes: saga.etapes,
          dateDebut: saga.dateDebut,
          dateFin: saga.dateFin,
          duree: saga.duree,
          erreur: saga.erreur,
          createdAt: saga.createdAt,
          updatedAt: saga.updatedAt
        }
      });

    } catch (error) {
      logger.error('Erreur lors de la récupération de la saga:', error);
      
      res.status(500).json({
        error: 'Erreur lors de la récupération de la saga',
        message: error.message
      });
    }
  }

  async obtenirSagasParCommande(req, res) {
    try {
      const { commandeId } = req.params;

      const sagas = await sagaOrchestrator.obtenirSagasParCommande(commandeId);

      res.status(200).json({
        commandeId,
        sagas: sagas.map(saga => ({
          id: saga.id,
          etat: saga.etat,
          etapeCourante: saga.etapeCourante,
          dateDebut: saga.dateDebut,
          dateFin: saga.dateFin,
          duree: saga.duree,
          erreur: saga.erreur,
          createdAt: saga.createdAt
        }))
      });

    } catch (error) {
      logger.error('Erreur lors de la récupération des sagas:', error);
      
      res.status(500).json({
        error: 'Erreur lors de la récupération des sagas',
        message: error.message
      });
    }
  }

  async obtenirStatistiques(req, res) {
    try {
      const totalSagas = await Saga.count();
      const sagasConfirmees = await Saga.count({ where: { etat: 'CONFIRMEE' } });
      const sagasAnnulees = await Saga.count({ where: { etat: 'ANNULEE' } });
      const sagasEnErreur = await Saga.count({ where: { etat: 'EN_ERREUR' } });

      // Calculer la durée moyenne des sagas terminées
      const sagasTerminees = await Saga.findAll({
        where: {
          etat: ['CONFIRMEE', 'ANNULEE'],
          duree: { [require('sequelize').Op.not]: null }
        },
        attributes: ['duree']
      });

      const dureeMoyenne = sagasTerminees.length > 0 
        ? sagasTerminees.reduce((sum, saga) => sum + saga.duree, 0) / sagasTerminees.length
        : 0;

      res.status(200).json({
        statistiques: {
          total: totalSagas,
          confirmees: sagasConfirmees,
          annulees: sagasAnnulees,
          enErreur: sagasEnErreur,
          dureeMoyenneMs: Math.round(dureeMoyenne),
          tauxSucces: totalSagas > 0 ? ((sagasConfirmees / totalSagas) * 100).toFixed(2) : 0
        }
      });

    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques:', error);
      
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  }

  async obtenirSagasRecentes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const sagas = await Saga.findAll({
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['id', 'commandeId', 'etat', 'etapeCourante', 'dateDebut', 'dateFin', 'duree', 'erreur', 'createdAt']
      });

      res.status(200).json({
        sagas: sagas.map(saga => ({
          id: saga.id,
          commandeId: saga.commandeId,
          etat: saga.etat,
          etapeCourante: saga.etapeCourante,
          dateDebut: saga.dateDebut,
          dateFin: saga.dateFin,
          duree: saga.duree,
          erreur: saga.erreur,
          createdAt: saga.createdAt
        }))
      });

    } catch (error) {
      logger.error('Erreur lors de la récupération des sagas récentes:', error);
      
      res.status(500).json({
        error: 'Erreur lors de la récupération des sagas récentes',
        message: error.message
      });
    }
  }
}

module.exports = new SagaController();
