const { Sequelize } = require('sequelize');

const dbName     = process.env.DB_NAME     || 'caisse';
const dbUser     = process.env.DB_USER     || 'postgres';
const dbPassword = process.env.DB_PASS     || process.env.DB_PASSWORD || 'postgres';
const dbHost     = process.env.DB_HOST     || 'localhost';
const dbPort     = process.env.DB_PORT     || 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host:     dbHost,
  port:     dbPort,
  dialect:  'postgres',
  logging:  false,
});

module.exports = sequelize;