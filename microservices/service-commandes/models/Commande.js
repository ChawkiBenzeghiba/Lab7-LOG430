const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Commande = sequelize.define('Commande', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numeroCommande: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  montantTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  statut: {
    type: DataTypes.ENUM('en_attente', 'validee', 'en_preparation', 'expediee', 'livree', 'annulee'),
    defaultValue: 'en_attente'
  },
  adresseLivraison: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  adresseFacturation: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  methodePaiement: {
    type: DataTypes.ENUM('carte_credit', 'paypal', 'virement'),
    allowNull: false
  },
  dateCommande: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dateLivraison: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'commandes',
  timestamps: true
});

module.exports = Commande; 