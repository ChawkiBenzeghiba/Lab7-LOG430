const sequelize      = require('./db');
const Produit       = require('./models/produit');
const Magasin       = require('./models/magasin');
const Vente         = require('./models/vente');
const StockCentral  = require('./models/stockCentral');

async function seed() {
  try {
    console.log('Réinitialisation de la base...');
    await sequelize.sync({ force: true });
    console.log("Structure des tables synchronisée (force:true)");

    const magasinsData = [
      { nom: 'Alger' },
      { nom: 'Oran' },
      { nom: 'Bejaia' },
      { nom: 'Blida' },
      { nom: 'Chlef' }
    ];
    const magasins = await Magasin.bulkCreate(magasinsData, { returning: true });
    console.log(`Magasins créés : ${magasins.map(m => m.nom).join(', ')}`);

    // Génération de 45 produits pour tester la pagination (3 pages pleines si pageSize=20)
    const produitsData = Array.from({length: 45}, (_, i) => ({
      nom: `Produit${i+1}`,
      categorie: ['Alimentation', 'Hygiène', 'Boissons'][i%3],
      prix: (Math.random() * 10 + 1).toFixed(2)
    }));
    const produits = await Produit.bulkCreate(produitsData, { returning: true });
    console.log(`Produits créés : ${produits.map(p => p.nom).join(', ')}`);

    await Promise.all(magasins.map(async magasin => {
      const inv = {};
      produits.forEach(p => {
        inv[p.id] = Math.floor(Math.random() * 30) + 1;
      });
      magasin.inventaire = inv;   
      await magasin.save();
    }));
    console.log(`Inventaire initialisé pour ${magasins.length} magasins`);
    
    const STOCK_INIT = 350;
    const inventaireCentral = {};
    produits.forEach(p => {
      inventaireCentral[p.id] = STOCK_INIT;
    });
    await StockCentral.create({ inventaire: inventaireCentral });
    console.log(`Stock central singleton initialisé avec ${Object.keys(inventaireCentral).length} produits`);

    // 5) Création des ventes
    const ventesData = [];
    magasins.forEach(magasin => {
      produits.forEach(produit => {
        const quantiteVendu = Math.floor(Math.random() * 16) + 5;
        ventesData.push({
          quantite: quantiteVendu,
          prixUnitaire: produit.prix,
          ProduitId: produit.id,
          MagasinId: magasin.id
        });
      });
    });
    await Vente.bulkCreate(ventesData);
    console.log(`Ventes créées : ${ventesData.length} enregistrements`);

    console.log('Seed terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seed :', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seed();
