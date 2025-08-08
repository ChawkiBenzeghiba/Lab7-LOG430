const Produit = require('./models/Produit');
const { sequelize } = require('./models/database');

// Données d'initialisation des produits
const produitsInitiaux = [
  {
    nom: "iPhone 15 Pro",
    description: "Dernier smartphone Apple avec puce A17 Pro, écran 6.1 pouces, triple caméra",
    prix: 1199.99,
    categorie: "Électronique",
    codeProduit: "IPHONE-15-PRO-001",
    quantiteStock: 25
  },
  {
    nom: "Samsung Galaxy S24",
    description: "Flagship Android avec IA intégrée, écran 6.2 pouces, caméra 200MP",
    prix: 999.99,
    categorie: "Électronique",
    codeProduit: "SAMSUNG-S24-001",
    quantiteStock: 30
  },
  {
    nom: "MacBook Air M3",
    description: "Ordinateur portable Apple avec puce M3, 13.6 pouces, 8GB RAM",
    prix: 1499.99,
    categorie: "Informatique",
    codeProduit: "MACBOOK-AIR-M3-001",
    quantiteStock: 15
  },
  {
    nom: "Dell XPS 13",
    description: "Ultrabook premium avec processeur Intel i7, 13.4 pouces, 16GB RAM",
    prix: 1299.99,
    categorie: "Informatique",
    codeProduit: "DELL-XPS-13-001",
    quantiteStock: 20
  },
  {
    nom: "Sony WH-1000XM5",
    description: "Casque sans fil avec réduction de bruit active, 30h d'autonomie",
    prix: 399.99,
    categorie: "Audio",
    codeProduit: "SONY-WH1000XM5-001",
    quantiteStock: 40
  },
  {
    nom: "AirPods Pro 2",
    description: "Écouteurs sans fil Apple avec réduction de bruit et audio spatial",
    prix: 249.99,
    categorie: "Audio",
    codeProduit: "AIRPODS-PRO-2-001",
    quantiteStock: 50
  },
  {
    nom: "Clean Code",
    description: "Guide pour écrire du code propre par Robert C. Martin",
    prix: 49.99,
    categorie: "Livres",
    codeProduit: "CLEAN-CODE-001",
    quantiteStock: 100
  },
  {
    nom: "Design Patterns",
    description: "Patterns de conception par Gang of Four",
    prix: 59.99,
    categorie: "Livres",
    codeProduit: "DESIGN-PATTERNS-001",
    quantiteStock: 75
  },
  {
    nom: "Nike Air Max 270",
    description: "Chaussures de sport avec amorti Air Max, confort maximal",
    prix: 129.99,
    categorie: "Vêtements",
    codeProduit: "NIKE-AIRMAX-270-001",
    quantiteStock: 60
  },
  {
    nom: "Adidas Ultraboost 22",
    description: "Chaussures de running avec technologie Boost, légères et réactives",
    prix: 179.99,
    categorie: "Vêtements",
    codeProduit: "ADIDAS-ULTRABOOST-22-001",
    quantiteStock: 45
  }
];

// Fonction pour initialiser les données
async function initialiserDonnees() {
  try {
    console.log('Début de l\'initialisation des données...');
    
    // Vérifier si des produits existent déjà
    const produitsExistants = await Produit.count();
    
    if (produitsExistants > 0) {
      console.log(`${produitsExistants} produits existent déjà. Initialisation ignorée.`);
      return;
    }

    // Créer les produits
    const produitsCrees = [];
    for (const produitData of produitsInitiaux) {
      const { quantiteStock, ...produitInfo } = produitData;
      
      const produit = await Produit.create(produitInfo);
      produitsCrees.push({
        produit,
        quantiteStock
      });
      
      console.log(`Produit créé: ${produit.nom} (ID: ${produit.id})`);
    }

    console.log(`${produitsCrees.length} produits créés avec succès.`);
    
    // Retourner les données pour le stock
    return produitsCrees;
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données:', error);
    throw error;
  }
}

module.exports = { initialiserDonnees, produitsInitiaux }; 