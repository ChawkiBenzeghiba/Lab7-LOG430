const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Produit = sequelize.define('Produit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prix: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  tableName: 'produits',
  timestamps: false,
});

module.exports = Produit;
