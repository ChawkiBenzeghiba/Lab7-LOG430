const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const CommandeItem = sequelize.define('CommandeItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  commandeId: {
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
  }
}, {
  tableName: 'commande_items',
  timestamps: true
});

module.exports = CommandeItem; 