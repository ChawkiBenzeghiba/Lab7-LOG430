const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3012;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

// Redis pour publication d'événements
const redis = new Redis({ host: REDIS_HOST, port: 6379 });
const EVENTS_ORDERS_STREAM = process.env.EVENTS_ORDERS_STREAM || 'orders.events';

// Prometheus métriques
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const commandsProcessed = new promClient.Counter({ 
    name: 'commands_processed_total', 
    help: 'Total commands processed', 
    labelNames: ['command_type'] 
});
const eventsPublished = new promClient.Counter({ 
    name: 'events_published_total', 
    help: 'Total events published', 
    labelNames: ['event_type'] 
});
register.registerMetric(commandsProcessed);
register.registerMetric(eventsPublished);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Validation des commandes
const validateOrderCommand = (req, res, next) => {
    const { clientId, items, total } = req.body;
    
    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
            error: 'Commande invalide: clientId et items requis' 
        });
    }
    
    if (!total || total <= 0) {
        return res.status(400).json({ 
            error: 'Commande invalide: total doit être positif' 
        });
    }
    
    next();
};

// CQRS Command: Créer une commande
app.post('/api/commands/orders', validateOrderCommand, async (req, res) => {
    try {
        const { clientId, items, total, adresseLivraison, adresseFacturation } = req.body;
        
        // Générer un ID unique pour la commande
        const orderId = uuidv4();
        
        // Créer l'événement OrderCreated
        const event = {
            id: orderId,
            type: 'OrderCreated',
            timestamp: new Date().toISOString(),
            payload: {
                orderId,
                clientId: Number(clientId),
                items,
                total: Number(total),
                adresseLivraison: adresseLivraison || '',
                adresseFacturation: adresseFacturation || '',
                status: 'pending'
            }
        };
        
        // Publier l'événement sur le stream
        await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(event));
        
        // Métriques
        commandsProcessed.labels('CreateOrder').inc();
        eventsPublished.labels('OrderCreated').inc();
        
        res.status(202).json({
            success: true,
            message: 'Commande créée et événement publié',
            data: {
                orderId,
                eventId: event.id,
                stream: EVENTS_ORDERS_STREAM
            }
        });
        
    } catch (error) {
        console.error('Erreur création commande:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la création de la commande' 
        });
    }
});

// CQRS Command: Annuler une commande
app.post('/api/commands/orders/:orderId/cancel', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        // Créer l'événement OrderCancelled
        const event = {
            id: uuidv4(),
            type: 'OrderCancelled',
            timestamp: new Date().toISOString(),
            payload: {
                orderId,
                reason: reason || 'Annulation par l\'utilisateur',
                cancelledAt: new Date().toISOString()
            }
        };
        
        // Publier l'événement
        await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(event));
        
        // Métriques
        commandsProcessed.labels('CancelOrder').inc();
        eventsPublished.labels('OrderCancelled').inc();
        
        res.status(202).json({
            success: true,
            message: 'Commande annulée et événement publié',
            data: {
                orderId,
                eventId: event.id,
                stream: EVENTS_ORDERS_STREAM
            }
        });
        
    } catch (error) {
        console.error('Erreur annulation commande:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'annulation de la commande' 
        });
    }
});

// CQRS Command: Mettre à jour une commande
app.put('/api/commands/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { items, total, adresseLivraison, adresseFacturation } = req.body;
        
        // Créer l'événement OrderUpdated
        const event = {
            id: uuidv4(),
            type: 'OrderUpdated',
            timestamp: new Date().toISOString(),
            payload: {
                orderId,
                items,
                total: Number(total),
                adresseLivraison,
                adresseFacturation,
                updatedAt: new Date().toISOString()
            }
        };
        
        // Publier l'événement
        await redis.xadd(EVENTS_ORDERS_STREAM, '*', 'event', JSON.stringify(event));
        
        // Métriques
        commandsProcessed.labels('UpdateOrder').inc();
        eventsPublished.labels('OrderUpdated').inc();
        
        res.status(202).json({
            success: true,
            message: 'Commande mise à jour et événement publié',
            data: {
                orderId,
                eventId: event.id,
                stream: EVENTS_ORDERS_STREAM
            }
        });
        
    } catch (error) {
        console.error('Erreur mise à jour commande:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour de la commande' 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'service-api-command',
        timestamp: new Date().toISOString(),
        cqrs: {
            side: 'Command',
            description: 'Service de commandes CQRS - publie des événements'
        }
    });
});

// Métriques Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'CQRS Command Service',
        version: '1.0.0',
        description: 'Service de commandes CQRS - gère les écritures et publie des événements',
        endpoints: {
            health: '/health',
            metrics: '/metrics',
            commands: {
                createOrder: 'POST /api/commands/orders',
                cancelOrder: 'POST /api/commands/orders/:orderId/cancel',
                updateOrder: 'PUT /api/commands/orders/:orderId'
            }
        },
        cqrs: {
            side: 'Command',
            responsibility: 'Write operations and event publishing',
            eventStream: EVENTS_ORDERS_STREAM
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Erreur CQRS Command:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur CQRS Command',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint CQRS Command non trouvé',
        path: req.originalUrl
    });
});

app.listen(PORT, () => {
    console.log(`CQRS Command Service démarré sur le port ${PORT}`);
    console.log(`Stream d'événements: ${EVENTS_ORDERS_STREAM}`);
    console.log(`Métriques disponibles sur http://localhost:${PORT}/metrics`);
});
