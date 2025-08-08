const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Vente = sequelize.define('Vente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  magasinId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  produitId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  prixUnitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  prixTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  dateVente: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  type: {
    type: DataTypes.ENUM('vente', 'retour', 'paiement', 'remboursement'),
    defaultValue: 'vente'
  },
  statut: {
    type: DataTypes.ENUM('en_cours', 'terminee', 'annulee'),
    defaultValue: 'en_cours'
  },
  commandeId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID de la commande associée pour les paiements'
  }
}, {
  tableName: 'ventes',
  timestamps: true
});

module.exports = Vente; 