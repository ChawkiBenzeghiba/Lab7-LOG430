const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Produit = require('./produit');
const Magasin = require('./magasin');

const Vente = sequelize.define('Vente', {
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  prixUnitaire: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  }
});

Vente.belongsTo(Produit);
Produit.hasMany(Vente);

Vente.belongsTo(Magasin);
Magasin.hasMany(Vente);

module.exports = Vente;
