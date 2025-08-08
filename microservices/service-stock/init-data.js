const StockCentral = require('./models/StockCentral');
const { sequelize } = require('./models/database');

// Fonction pour initialiser le stock central
async function initialiserStock(produitsAvecQuantites) {
  try {
    console.log('Initialisation du stock central...');
    
    // Vérifier si le stock central existe déjà
    let stockCentral = await StockCentral.findOne();
    
    if (!stockCentral) {
      stockCentral = await StockCentral.create({ inventaire: {} });
      console.log('Stock central créé.');
    } else {
      console.log('Stock central existant trouvé.');
    }

    // Ajouter les quantités pour chaque produit
    const inventaire = stockCentral.inventaire;
    let produitsAjoutes = 0;

    for (const { produit, quantiteStock } of produitsAvecQuantites) {
      inventaire[produit.id] = quantiteStock;
      produitsAjoutes++;
      console.log(`Stock ajouté: ${produit.nom} - ${quantiteStock} unités`);
    }

    // Sauvegarder les modifications
    stockCentral.changed('inventaire', true);
    await stockCentral.save();

    console.log(`${produitsAjoutes} produits ajoutés au stock central.`);
    
    return stockCentral;
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du stock:', error);
    throw error;
  }
}

// Fonction pour récupérer le stock d'un produit
async function getStockProduit(produitId) {
  try {
    const stockCentral = await StockCentral.findOne();
    if (!stockCentral) {
      return 0;
    }
    
    return stockCentral.inventaire[produitId] || 0;
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    return 0;
  }
}

// Fonction pour mettre à jour le stock d'un produit
async function updateStockProduit(produitId, nouvelleQuantite) {
  try {
    const stockCentral = await StockCentral.findOne();
    if (!stockCentral) {
      throw new Error('Stock central introuvable');
    }
    
    const inventaire = stockCentral.inventaire;
    inventaire[produitId] = Math.max(0, nouvelleQuantite); // Éviter les quantités négatives
    
    stockCentral.changed('inventaire', true);
    await stockCentral.save();
    
    return inventaire[produitId];
  } catch (error) {
    console.error('Erreur lors de la mise à jour du stock:', error);
    throw error;
  }
}

// Fonction pour diminuer le stock d'un produit
async function diminuerStock(produitId, quantite) {
  try {
    const stockCentral = await StockCentral.findOne();
    if (!stockCentral) {
      throw new Error('Stock central introuvable');
    }
    
    const inventaire = stockCentral.inventaire;
    const stockActuel = inventaire[produitId] || 0;
    
    if (stockActuel < quantite) {
      throw new Error(`Stock insuffisant: demandé ${quantite}, disponible ${stockActuel}`);
    }
    
    inventaire[produitId] = stockActuel - quantite;
    
    stockCentral.changed('inventaire', true);
    await stockCentral.save();
    
    return inventaire[produitId];
  } catch (error) {
    console.error('Erreur lors de la diminution du stock:', error);
    throw error;
  }
}

module.exports = { 
  initialiserStock, 
  getStockProduit, 
  updateStockProduit, 
  diminuerStock 
}; 