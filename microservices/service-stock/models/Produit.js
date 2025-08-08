const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Produit = sequelize.define('Produit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prix: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false
  },
  codeProduit: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'produits',
  timestamps: true
});

module.exports = Produit; 