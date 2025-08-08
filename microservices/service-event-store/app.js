const express = require('express');
const Redis = require('ioredis');
const Database = require('better-sqlite3');
const promClient = require('prom-client');

const PORT = process.env.PORT || 3011;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const STREAMS = [
  process.env.EVENTS_ORDERS_STREAM || 'orders.events',
  process.env.EVENTS_STOCK_STREAM || 'stock.events',
  process.env.EVENTS_PAYMENTS_STREAM || 'payments.events'
];

// DB locale pour Event Store (strict minimum)
const db = new Database('event-store.db');
db.prepare(`CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  stream TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  payload TEXT NOT NULL
)`).run();

const insertStmt = db.prepare('INSERT OR IGNORE INTO events (id, stream, type, timestamp, payload) VALUES (?, ?, ?, ?, ?)');
const queryByAggregate = db.prepare("SELECT * FROM events WHERE payload LIKE ? ORDER BY rowid ASC");

// Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const eventsConsumed = new promClient.Counter({ name: 'events_consumed_total', help: 'Total events consumed', labelNames: ['stream', 'type'] });
register.registerMetric(eventsConsumed);

// Redis consumer
const redis = new Redis({ host: REDIS_HOST, port: 6379 });

async function poll(stream) {
  let lastId = '0-0';
  while (true) {
    try {
      const data = await redis.xread('BLOCK', 1000, 'STREAMS', stream, lastId);
      if (data) {
        for (const [, entries] of data) {
          for (const [id, fields] of entries) {
            lastId = id;
            const event = JSON.parse(fields[1]);
            insertStmt.run(event.id, stream, event.type, event.timestamp, JSON.stringify(event.payload));
            eventsConsumed.labels(stream, event.type).inc();
          }
        }
      }
    } catch (e) {
      // Continue loop, minimal logging
      console.error('event-store poll error:', e.message);
    }
  }
}

// API
const app = express();
app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// CQRS Read Models - État brut par aggregateId
app.get('/state/:aggregateId', (req, res) => {
  const id = req.params.aggregateId;
  const rows = queryByAggregate.all(`%"orderId":"${id}"%`);
  res.json({ aggregateId: id, events: rows.map(r => ({ id: r.id, stream: r.stream, type: r.type, timestamp: r.timestamp, payload: JSON.parse(r.payload) })) });
});

// CQRS Read Model: Vue optimisée des commandes
app.get('/api/queries/orders/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const rows = queryByAggregate.all(`%"orderId":"${orderId}"%`);
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Commande non trouvée' });
  }
  
  // Reconstruire l'état de la commande à partir des événements
  let orderState = {
    orderId,
    status: 'unknown',
    total: 0,
    items: [],
    clientId: null,
    createdAt: null,
    updatedAt: null
  };
  
  rows.forEach(row => {
    const event = JSON.parse(row.payload);
    const eventType = row.type;
    
    switch (eventType) {
      case 'OrderCreated':
        orderState = {
          ...orderState,
          status: 'pending',
          total: event.total,
          items: event.items,
          clientId: event.clientId,
          createdAt: event.timestamp,
          adresseLivraison: event.adresseLivraison,
          adresseFacturation: event.adresseFacturation
        };
        break;
      case 'OrderUpdated':
        orderState = {
          ...orderState,
          total: event.total,
          items: event.items,
          adresseLivraison: event.adresseLivraison,
          adresseFacturation: event.adresseFacturation,
          updatedAt: event.timestamp
        };
        break;
      case 'OrderCancelled':
        orderState = {
          ...orderState,
          status: 'cancelled',
          cancelledAt: event.timestamp,
          cancelReason: event.reason
        };
        break;
      case 'PaymentAuthorized':
        orderState = {
          ...orderState,
          status: 'confirmed',
          paymentAuthorizedAt: event.timestamp
        };
        break;
      case 'PaymentFailed':
        orderState = {
          ...orderState,
          status: 'payment_failed',
          paymentFailedAt: event.timestamp
        };
        break;
    }
  });
  
  res.json({
    success: true,
    data: orderState,
    eventCount: rows.length,
    lastEvent: rows[rows.length - 1] ? rows[rows.length - 1].type : null
  });
});

// CQRS Read Model: Liste des commandes d'un client
app.get('/api/queries/clients/:clientId/orders', (req, res) => {
  const clientId = req.params.clientId;
  const rows = db.prepare("SELECT * FROM events WHERE payload LIKE ? ORDER BY rowid ASC").all(`%"clientId":${clientId}%`);
  
  // Grouper par orderId
  const ordersMap = new Map();
  
  rows.forEach(row => {
    const event = JSON.parse(row.payload);
    const orderId = event.orderId;
    
    if (!ordersMap.has(orderId)) {
      ordersMap.set(orderId, {
        orderId,
        status: 'unknown',
        total: 0,
        items: [],
        clientId: clientId,
        createdAt: null
      });
    }
    
    const order = ordersMap.get(orderId);
    const eventType = row.type;
    
    switch (eventType) {
      case 'OrderCreated':
        order.status = 'pending';
        order.total = event.total;
        order.items = event.items;
        order.createdAt = event.timestamp;
        break;
      case 'OrderCancelled':
        order.status = 'cancelled';
        break;
      case 'PaymentAuthorized':
        order.status = 'confirmed';
        break;
      case 'PaymentFailed':
        order.status = 'payment_failed';
        break;
    }
  });
  
  const orders = Array.from(ordersMap.values());
  
  res.json({
    success: true,
    data: orders,
    count: orders.length,
    clientId: clientId
  });
});

// CQRS Read Model: Statistiques des commandes
app.get('/api/queries/orders/stats', (req, res) => {
  const allEvents = db.prepare("SELECT * FROM events WHERE type IN ('OrderCreated', 'OrderCancelled', 'PaymentAuthorized', 'PaymentFailed')").all();
  
  const stats = {
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    cancelledOrders: 0,
    failedOrders: 0,
    totalRevenue: 0
  };
  
  const orderStates = new Map();
  
  allEvents.forEach(row => {
    const event = JSON.parse(row.payload);
    const orderId = event.orderId;
    const eventType = row.type;
    
    if (!orderStates.has(orderId)) {
      orderStates.set(orderId, { status: 'unknown', total: 0 });
    }
    
    const order = orderStates.get(orderId);
    
    switch (eventType) {
      case 'OrderCreated':
        order.status = 'pending';
        order.total = event.total;
        stats.totalOrders++;
        stats.pendingOrders++;
        break;
      case 'OrderCancelled':
        if (order.status === 'pending') {
          stats.pendingOrders--;
          stats.cancelledOrders++;
        }
        order.status = 'cancelled';
        break;
      case 'PaymentAuthorized':
        if (order.status === 'pending') {
          stats.pendingOrders--;
          stats.confirmedOrders++;
          stats.totalRevenue += order.total;
        }
        order.status = 'confirmed';
        break;
      case 'PaymentFailed':
        if (order.status === 'pending') {
          stats.pendingOrders--;
          stats.failedOrders++;
        }
        order.status = 'failed';
        break;
    }
  });
  
  res.json({
    success: true,
    data: stats,
    calculatedAt: new Date().toISOString()
  });
});

app.post('/replay/:aggregateId', (req, res) => {
  const id = req.params.aggregateId;
  const rows = queryByAggregate.all(`%"orderId":"${id}"%`);
  res.json({ replayed: rows.length, aggregateId: id });
});

app.listen(PORT, () => {
  console.log(`Event Store service listening on ${PORT}`);
  STREAMS.forEach(s => poll(s));
});


