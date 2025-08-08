const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/database');
const panierRoutes = require('./routes/panierRoutes');

const app = express();
const PORT = process.env.PORT || 3006;
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';

// Middleware
app.use(cors());
app.use(express.json());

// Middleware pour ajouter l'ID de l'instance aux logs
app.use((req, res, next) => {
  console.log(`[Instance ${INSTANCE_ID}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/panier', panierRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'service-panier', 
    instance: INSTANCE_ID,
    timestamp: new Date().toISOString() 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Instance ${INSTANCE_ID}] Error:`, err.stack);
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
    console.log(`[Instance ${INSTANCE_ID}] Connexion à la base de données établie.`);
    
    await sequelize.sync();
    console.log(`[Instance ${INSTANCE_ID}] Modèles synchronisés avec la base de données.`);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Instance ${INSTANCE_ID}] Service Panier démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Instance ${INSTANCE_ID}] Erreur lors du démarrage:`, error);
    process.exit(1);
  }
};

startServer(); 