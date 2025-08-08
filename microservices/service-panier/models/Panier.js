const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Panier = sequelize.define('Panier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clientId: {
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
    defaultValue: 1,
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
  dateAjout: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'paniers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['clientId', 'produitId', 'actif']
    }
  ]
});

module.exports = Panier; 