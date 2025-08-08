const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');

// Routes
const sagaRoutes = require('./routes/sagaRoutes');

// Models
const { sequelize, syncModels } = require('./models');

// Metrics (centralized)
const metrics = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/saga', sagaRoutes);

// Health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'service-orchestrateur',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques:', error);
    res.status(500).end();
  }
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'Service Orchestrateur - Saga',
    version: '1.0.0',
    description: 'Service de gestion des sagas orchestrées pour les commandes',
    endpoints: { health: '/health', metrics: '/metrics', saga: '/api/saga' }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trouvé', path: req.path });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Erreur non gérée:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  });
});

// Init
async function initializeApp() {
  try {
    await sequelize.authenticate();
    logger.info('Connexion à la base de données établie avec succès.');

    await syncModels();

    app.listen(PORT, () => {
      logger.info(`Service orchestrateur démarré sur le port ${PORT}`);
      logger.info(`Métriques disponibles sur http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu, arrêt gracieux...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT reçu, arrêt gracieux...');
  await sequelize.close();
  process.exit(0);
});

// Export metrics for other modules if needed
module.exports = metrics;

initializeApp();
