const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/database');
const venteRoutes = require('./routes/venteRoutes');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3002;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const redis = new Redis({ host: REDIS_HOST, port: 6379 });
const EVENTS_STOCK_STREAM = process.env.EVENTS_STOCK_STREAM || 'stock.events';
const EVENTS_PAYMENTS_STREAM = process.env.EVENTS_PAYMENTS_STREAM || 'payments.events';

// Prometheus minimal
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const producedCounter = new promClient.Counter({ name: 'events_produced_total', help: 'Events produced', labelNames: ['type'] });
const consumedCounter = new promClient.Counter({ name: 'events_consumed_total', help: 'Events consumed', labelNames: ['type'] });
register.registerMetric(producedCounter);
register.registerMetric(consumedCounter);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ventes', venteRoutes);

// Écoute des réservations de stock et publie PaymentAuthorized / PaymentFailed
async function pollStockReservations() {
  let lastId = '0-0';
  while (true) {
    try {
      const streams = await redis.xread('BLOCK', 1000, 'STREAMS', EVENTS_STOCK_STREAM, lastId);
      if (streams) {
        for (const [, entries] of streams) {
          for (const [id, fields] of entries) {
            lastId = id;
            const eventStr = fields[1];
            const event = JSON.parse(eventStr);
            if (event.type === 'StockReserved') {
              const authorized = true; // strict minimum: autoriser toujours
              const nextEvent = {
                id: uuidv4(),
                type: authorized ? 'PaymentAuthorized' : 'PaymentFailed',
                timestamp: new Date().toISOString(),
                payload: { orderId: event.payload.orderId }
              };
              await redis.xadd(EVENTS_PAYMENTS_STREAM, '*', 'event', JSON.stringify(nextEvent));
              consumedCounter.labels('StockReserved').inc();
              producedCounter.labels(nextEvent.type).inc();
            }
          }
        }
      }
    } catch (e) {
      console.error('Erreur lecture stream stock:', e);
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'service-ventes', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie.');
    
    // IMPORTANT: apply model changes automatically
    await sequelize.sync({ alter: true });
    console.log('Modèles synchronisés avec la base de données.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Service Ventes démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer(); 
pollStockReservations();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});