const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/database');
const commandeRoutes = require('./routes/commandeRoutes');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');

// Importer les associations
require('./models/associations');

const app = express();
const PORT = process.env.PORT || 3007;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

// Pub/Sub minimal avec Redis Streams
const redis = new Redis({ host: REDIS_HOST, port: 6379 });
const EVENTS_ORDERS_STREAM = process.env.EVENTS_ORDERS_STREAM || 'orders.events';

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
app.use('/api/commandes', commandeRoutes);

// Endpoint minimal de Command -> Event (OrderCreated)
app.post('/api/commandes/:clientId/publier', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { items, total } = req.body;
    const event = {
      id: uuidv4(),
      type: 'OrderCreated',
      timestamp: new Date().toISOString(),
      payload: { clientId: Number(clientId), items: items || [], total: Number(total) || 0 }
    };
    await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(event));
    producedCounter.labels('OrderCreated').inc();
    res.status(202).json({ published: true, stream: EVENTS_ORDERS_STREAM, event });
  } catch (err) {
    console.error('Erreur publication OrderCreated:', err);
    res.status(500).json({ error: 'Publication échouée' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'service-commandes', timestamp: new Date().toISOString() });
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

// Start server + écoute des paiements
async function pollPayments() {
  const EVENTS_PAYMENTS_STREAM = process.env.EVENTS_PAYMENTS_STREAM || 'payments.events';
  let lastId = '0-0';
  while (true) {
    try {
      const streams = await redis.xread('BLOCK', 1000, 'STREAMS', EVENTS_PAYMENTS_STREAM, lastId);
      if (streams) {
        for (const [, entries] of streams) {
          for (const [id, fields] of entries) {
            lastId = id;
            const eventStr = fields[1];
            const event = JSON.parse(eventStr);
            consumedCounter.labels(event.type).inc();
            
            if (event.type === 'PaymentAuthorized') {
              console.log('PaymentAuthorized reçu pour orderId', event.payload.orderId);
              // Publier l'événement de confirmation de commande
              const confirmEvent = {
                id: uuidv4(),
                type: 'OrderConfirmed',
                timestamp: new Date().toISOString(),
                payload: { 
                  orderId: event.payload.orderId,
                  montant: event.payload.montant
                }
              };
              await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(confirmEvent));
              producedCounter.labels('OrderConfirmed').inc();
              console.log(`Commande confirmée pour orderId ${event.payload.orderId}`);
              
            } else if (event.type === 'PaymentFailed') {
              console.log('PaymentFailed reçu pour orderId', event.payload.orderId);
              // Publier compensation: OrderCancelled
              const cancelEvent = {
                id: uuidv4(),
                type: 'OrderCancelled',
                timestamp: new Date().toISOString(),
                payload: { 
                  orderId: event.payload.orderId,
                  reason: event.payload.reason || 'Paiement échoué'
                }
              };
              await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(cancelEvent));
              producedCounter.labels('OrderCancelled').inc();
              console.log(`Commande annulée pour orderId ${event.payload.orderId} - raison: ${event.payload.reason}`);
            }
          }
        }
      }
    } catch (e) {
      console.error('Erreur lecture stream payments:', e);
    }
  }
}

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie.');
    
    await sequelize.sync();
    console.log('Modèles synchronisés avec la base de données.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Service Commandes démarré sur le port ${PORT}`);
    });
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });
    pollPayments();
  } catch (error) {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer(); 