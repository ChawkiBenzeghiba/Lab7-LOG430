const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const StockCentral = sequelize.define('StockCentral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inventaire: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'stock_central',
  timestamps: true
});

module.exports = StockCentral; 