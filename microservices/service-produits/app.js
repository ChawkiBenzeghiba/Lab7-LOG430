const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/database');
const produitRoutes = require('./routes/produitRoutes');
const { initialiserDonnees } = require('./init-data');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/produits', produitRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'service-produits', timestamp: new Date().toISOString() });
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
    
    // Initialiser les données
    const produitsCrees = await initialiserDonnees();
    
    // Si des produits ont été créés, notifier le service stock
    if (produitsCrees && produitsCrees.length > 0) {
      console.log(`${produitsCrees.length} produits prêts pour l'initialisation du stock.`);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Service Produits démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer(); 