const { DataTypes } = require('sequelize');
const sequelize         = require('../db');

const StockCentral = sequelize.define('StockCentral', {
  inventaire: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  freezeTableName: true,
  tableName: 'StockCentral'
});

module.exports = StockCentral;