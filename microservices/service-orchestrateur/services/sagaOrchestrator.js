const axios = require('axios');
const { Saga } = require('../models');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

class SagaOrchestrator {
  constructor() {
    this.services = {
      stock: process.env.STOCK_SERVICE_URL || 'http://service-stock:3003',
      ventes: process.env.VENTES_SERVICE_URL || 'http://service-ventes:3002',
      commandes: process.env.COMMANDES_SERVICE_URL || 'http://service-commandes:3007'
    };
    
    this.timeout = 10000; // 10 secondes
  }

  async demarrerSaga(commandeData) {
    const saga = await Saga.create({
      commandeId: commandeData.id,
      etat: 'CREEE',
      etapeCourante: 0,
      etapes: [{
        etape: 0,
        nom: 'CREEE',
        timestamp: new Date(),
        status: 'SUCCESS'
      }]
    });

    logger.info(`Saga démarrée pour la commande ${commandeData.id}`, { sagaId: saga.id });

    const sagaStart = process.hrtime.bigint();

    try {
      // Étape 1: Vérification du stock
      await this.verifierStock(saga, commandeData);
      
      // Étape 2: Réservation du stock
      await this.reserverStock(saga, commandeData);
      
      // Étape 3: Traitement du paiement
      await this.traiterPaiement(saga, commandeData);
      
      // Étape 4: Confirmation de la commande
      await this.confirmerCommande(saga, commandeData);
      
      // Saga terminée avec succès
      await this.terminerSaga(saga, 'CONFIRMEE');

      // Metrics
      const durationSec = Number(process.hrtime.bigint() - sagaStart) / 1e9;
      metrics.sagaDuration.labels('CONFIRMEE').observe(durationSec);
      metrics.sagaTotal.labels('CONFIRMEE').inc();
      
      return { success: true, sagaId: saga.id, etat: 'CONFIRMEE' };
      
    } catch (error) {
      logger.error(`Erreur dans la saga ${saga.id}:`, error);
      await this.gérerErreur(saga, error);

      // Metrics (échec)
      const durationSec = Number(process.hrtime.bigint() - sagaStart) / 1e9;
      metrics.sagaDuration.labels('ANNULEE').observe(durationSec);
      metrics.sagaTotal.labels('ANNULEE').inc();

      throw error;
    }
  }

  async verifierStock(saga, commandeData) {
    logger.info(`Vérification du stock pour la commande ${commandeData.id}`);
    const stepStart = process.hrtime.bigint();
    
    try {
      const response = await axios.post(
        `${this.services.stock}/api/stock/verifier`,
        { produits: commandeData.produits },
        { timeout: this.timeout }
      );

      if (response.data.disponible) {
        await this.mettreAJourEtape(saga, 1, 'STOCK_VERIFIE', 'SUCCESS');
        metrics.sagaStepDuration.labels('STOCK_VERIFIE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
        logger.info(`Stock vérifié avec succès pour la commande ${commandeData.id}`);
      } else {
        throw new Error('Stock insuffisant');
      }
    } catch (error) {
      metrics.sagaStepDuration.labels('STOCK_VERIFIE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      await this.mettreAJourEtape(saga, 1, 'STOCK_VERIFIE', 'FAILED', error.message);
      throw new Error(`Échec de vérification du stock: ${error.message}`);
    }
  }

  async reserverStock(saga, commandeData) {
    logger.info(`Réservation du stock pour la commande ${commandeData.id}`);
    const stepStart = process.hrtime.bigint();
    
    try {
      await axios.post(
        `${this.services.stock}/api/stock/reserver`,
        { 
          commandeId: commandeData.id,
          produits: commandeData.produits 
        },
        { timeout: this.timeout }
      );

      await this.mettreAJourEtape(saga, 2, 'STOCK_RESERVE', 'SUCCESS');
      metrics.sagaStepDuration.labels('STOCK_RESERVE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      logger.info(`Stock réservé avec succès pour la commande ${commandeData.id}`);
    } catch (error) {
      metrics.sagaStepDuration.labels('STOCK_RESERVE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      await this.mettreAJourEtape(saga, 2, 'STOCK_RESERVE', 'FAILED', error.message);
      throw new Error(`Échec de réservation du stock: ${error.message}`);
    }
  }

  async traiterPaiement(saga, commandeData) {
    logger.info(`Traitement du paiement pour la commande ${commandeData.id}`);
    const stepStart = process.hrtime.bigint();
    
    try {
      await axios.post(
        `${this.services.ventes}/api/ventes/paiement`,
        {
          commandeId: commandeData.id,
          montant: commandeData.montant,
          methodePaiement: commandeData.methodePaiement
        },
        { timeout: this.timeout }
      );

      await this.mettreAJourEtape(saga, 3, 'PAIEMENT_TENTE', 'SUCCESS');
      metrics.sagaStepDuration.labels('PAIEMENT_TENTE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      logger.info(`Paiement traité avec succès pour la commande ${commandeData.id}`);
    } catch (error) {
      metrics.sagaStepDuration.labels('PAIEMENT_TENTE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      await this.mettreAJourEtape(saga, 3, 'PAIEMENT_TENTE', 'FAILED', error.message);
      throw new Error(`Échec du paiement: ${error.message}`);
    }
  }

  async confirmerCommande(saga, commandeData) {
    logger.info(`Confirmation de la commande ${commandeData.id}`);
    const stepStart = process.hrtime.bigint();
    
    try {
      const isIntegerId = /^\d+$/.test(String(commandeData.id));
      if (!isIntegerId) {
        logger.warn(`ID de commande non entier (${commandeData.id}). Saut de la MAJ service-commandes.`);
        await this.mettreAJourEtape(saga, 4, 'CONFIRMEE', 'SUCCESS');
        metrics.sagaStepDuration.labels('CONFIRMEE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
        return;
      }

      await axios.put(
        `${this.services.commandes}/api/commandes/${commandeData.id}/etat`,
        { etat: 'CONFIRMEE' },
        { timeout: this.timeout }
      );

      await this.mettreAJourEtape(saga, 4, 'CONFIRMEE', 'SUCCESS');
      metrics.sagaStepDuration.labels('CONFIRMEE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      logger.info(`Commande confirmée avec succès: ${commandeData.id}`);
    } catch (error) {
      metrics.sagaStepDuration.labels('CONFIRMEE').observe(Number(process.hrtime.bigint() - stepStart) / 1e9);
      await this.mettreAJourEtape(saga, 4, 'CONFIRMEE', 'FAILED', error.message);
      throw new Error(`Échec de confirmation de la commande: ${error.message}`);
    }
  }

  async gérerErreur(saga, error) {
    logger.error(`Gestion d'erreur pour la saga ${saga.id}:`, error);
    
    const etapeCourante = saga.etapeCourante;
    
    if (etapeCourante >= 2) {
      await this.libererStock(saga);
      metrics.compensationTotal.labels('stock').inc();
    }
    
    if (etapeCourante >= 3) {
      await this.annulerPaiement(saga);
      metrics.compensationTotal.labels('paiement').inc();
    }
    
    await this.terminerSaga(saga, 'ANNULEE', error.message);
  }

  async libererStock(saga) {
    try {
      logger.info(`Libération du stock pour la saga ${saga.id}`);
      await axios.post(
        `${this.services.stock}/api/stock/liberer`,
        { commandeId: saga.commandeId },
        { timeout: this.timeout }
      );
      logger.info(`Stock libéré avec succès pour la saga ${saga.id}`);
    } catch (error) {
      logger.error(`Erreur lors de la libération du stock pour la saga ${saga.id}:`, error);
    }
  }

  async annulerPaiement(saga) {
    try {
      logger.info(`Annulation du paiement pour la saga ${saga.id}`);
      await axios.post(
        `${this.services.ventes}/api/ventes/annuler`,
        { commandeId: saga.commandeId },
        { timeout: this.timeout }
      );
      logger.info(`Paiement annulé avec succès pour la saga ${saga.id}`);
    } catch (error) {
      logger.error(`Erreur lors de l'annulation du paiement pour la saga ${saga.id}:`, error);
    }
  }

  async mettreAJourEtape(saga, etape, nom, status, erreur = null) {
    const etapeData = {
      etape,
      nom,
      timestamp: new Date(),
      status
    };

    if (erreur) {
      etapeData.erreur = erreur;
    }

    await saga.update({
      etat: nom,
      etapeCourante: etape,
      etapes: [...saga.etapes, etapeData],
      erreur: erreur || saga.erreur
    });
  }

  async terminerSaga(saga, etatFinal, erreur = null) {
    const dateFin = new Date();
    const duree = dateFin - saga.dateDebut;

    await saga.update({
      etat: etatFinal,
      dateFin,
      duree,
      erreur: erreur || saga.erreur
    });

    logger.info(`Saga ${saga.id} terminée avec l'état: ${etatFinal}`, { duree });
  }

  async obtenirSaga(sagaId) {
    return await Saga.findByPk(sagaId);
  }

  async obtenirSagasParCommande(commandeId) {
    return await Saga.findAll({
      where: { commandeId },
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = new SagaOrchestrator();
