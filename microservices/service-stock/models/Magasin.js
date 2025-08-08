const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Magasin = sequelize.define('Magasin', {
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
  adresse: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ville: {
    type: DataTypes.STRING,
    allowNull: true
  },
  codePostal: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telephone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inventaire: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'magasins',
  timestamps: true
});

module.exports = Magasin; 