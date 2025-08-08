const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const promClient = require('prom-client');
require('dotenv').config();

// Configuration Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const loadBalancingRequests = new promClient.Counter({
  name: 'load_balancing_requests_total',
  help: 'Total number of load balancing requests',
  labelNames: ['instance', 'service']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(loadBalancingRequests);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS sécurisée
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme les requêtes curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://frontend-client:80',
      'http://api-gateway:3000'
    ];
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Vérifier les patterns regex pour localhost et 127.0.0.1
      const localhostPattern = /^https?:\/\/localhost:\d+$/;
      const localhostIPPattern = /^https?:\/\/127\.0\.0\.1:\d+$/;
      
      if (localhostPattern.test(origin) || localhostIPPattern.test(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS: Origine non autorisée: ${origin}`);
        callback(new Error('Origine non autorisée par CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Instance'
  ],
  credentials: true,
  maxAge: 86400, // 24 heures
  optionsSuccessStatus: 200
};

// Middleware de métriques
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
    httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });
  next();
});

// Middleware de sécurité et logging
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());

// Middleware pour éviter le cache
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Configuration du load balancing round-robin pour le service panier
let panierInstanceIndex = 0;
const panierInstances = [
  'http://service-panier-1:3006',
  'http://service-panier-2:3006'
];

// Fonction pour sélectionner la prochaine instance panier (round-robin)
function getNextPanierInstance() {
  const instance = panierInstances[panierInstanceIndex];
  const instanceNumber = panierInstanceIndex + 1;
  panierInstanceIndex = (panierInstanceIndex + 1) % panierInstances.length;
  
  // Métriques de load balancing
  loadBalancingRequests.labels(`instance-${instanceNumber}`, 'panier').inc();
  
  console.log(`Load balancing: Route vers instance panier ${instanceNumber} (${instance})`);
  return instance;
}

// Configuration des microservices
const services = {
  produits: {
    target: 'http://service-produits:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/produits': '/api/produits'
    }
  },
  clients: {
    target: 'http://service-clients:3005',
    changeOrigin: true,
    pathRewrite: {
      '^/api/clients': '/api/clients'
    }
  },
  commandes: {
    target: 'http://service-commandes:3007',
    changeOrigin: true,
    pathRewrite: {
      '^/api/commandes': '/api/commandes'
    }
  },
  ventes: {
    target: 'http://service-ventes:3002',
    changeOrigin: true,
    pathRewrite: {
      '^/api/ventes': '/api/ventes'
    }
  },
  stock: {
    target: 'http://service-stock:3003',
    changeOrigin: true,
    pathRewrite: {
      '^/api/stock': '/api/stock'
    }
  },
  orchestrateur: {
    target: 'http://service-orchestrateur:3010',
    changeOrigin: true,
    pathRewrite: {
      '^/api/orchestrateur': '/api/saga'
    }
  }
};

// Routes de l'API Gateway
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway - Microservices E-commerce',
    version: '1.0.0',
    services: Object.keys(services),
    loadBalancing: {
      panier: {
        type: 'round-robin',
        instances: panierInstances.length,
        instances_urls: panierInstances
      }
    },
    endpoints: {
      produits: '/api/produits',
      clients: '/api/clients',
      panier: '/api/panier',
      commandes: '/api/commandes',
      ventes: '/api/ventes',
      stock: '/api/stock',
      orchestrateur: '/api/orchestrateur'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    loadBalancing: {
      panier: {
        currentInstance: panierInstanceIndex,
        totalInstances: panierInstances.length
      }
    }
  });
});

// Test CORS
app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      origins: corsOptions.origin,
      methods: corsOptions.methods,
      allowedHeaders: corsOptions.allowedHeaders
    }
  });
});

// Endpoint Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// OPTIONS preflight pour tous les endpoints
app.options('*', cors(corsOptions));

// Configuration des proxies pour chaque service
Object.entries(services).forEach(([serviceName, config]) => {
  app.use(`/api/${serviceName}`, createProxyMiddleware(config));
});

// Configuration spéciale pour le service panier avec load balancing
app.use('/api/panier', createProxyMiddleware({
  target: getNextPanierInstance(),
  changeOrigin: true,
  pathRewrite: {
    '^/api/panier': '/api/panier'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Mettre à jour la target pour chaque requête
    proxyReq.setHeader('X-Instance', panierInstanceIndex + 1);
  },
  router: (req) => {
    return getNextPanierInstance();
  }
}));

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: err.message
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway démarré sur le port ${PORT}`);
  console.log(`Services disponibles: ${Object.keys(services).join(', ')}`);
  console.log(`Load balancing activé pour le service panier avec ${panierInstances.length} instances`);
}); 