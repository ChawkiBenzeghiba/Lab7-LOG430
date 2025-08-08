const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/database');
const clientRoutes = require('./routes/clientRoutes');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/clients', clientRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'service-clients', timestamp: new Date().toISOString() });
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
    
    await sequelize.sync();
    console.log('Modèles synchronisés avec la base de données.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Service Clients démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer(); 