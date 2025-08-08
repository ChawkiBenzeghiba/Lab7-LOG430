const Produit  = require('./models/produit');
const Magasin  = require('./models/magasin');
const Vente    = require('./models/vente');
const StockCentral = require('./models/stockCentral');

async function safeSync(model, options = {}) {
  try {
    await model.sync(options);
    console.log(`Synchronisation réussie : table "${model.tableName}"`);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      console.log(`Table "${model.tableName}" déjà synchronisée. Erreur ignorée.`);
    } else {
      console.error(`Erreur synchronisation table "${model.tableName}":`, err);
      throw err; 
    }
  }
}

(async () => {
  await safeSync(Produit, { alter: true });
  await safeSync(Magasin, { alter: true });
  await safeSync(Vente, { alter: true });
  await safeSync(StockCentral, { alter: true });
  console.log('Tous les modèles ont été synchronisés.');
})();
