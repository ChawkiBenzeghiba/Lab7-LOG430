const StockCentral  = require('../models/stockCentral');
const Produit      = require('../models/produit');
const Magasin      = require('../models/magasin');

exports.afficherStock = async (_req, res) => {
  try {
    const stock = await StockCentral.findOne();
    if (!stock) return res.status(404).json({ error: 'Stock central introuvable' });

    // Pagination
    const limit = parseInt(_req.query.limit, 10) || 50;
    const offset = parseInt(_req.query.offset, 10) || 0;
    const { count, rows: produits } = await Produit.findAndCountAll({ limit, offset });
    const inventaire = stock.inventaire;

    const stockListe = produits.map(p => ({
      id      : p.id,
      nom     : p.nom,
      quantite: inventaire[p.id] || 0
    }));

    res.json({ total: count, produits: stockListe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.retirerDuStock = async (req, res) => {
  try {
    const { produitId, quantiteDemandee } = req.body;
    const stock = await StockCentral.findOne();
    const inventaire = stock.inventaire;
    const dispo = inventaire[produitId] || 0;

    if (quantiteDemandee > dispo) {
      return res.status(400).json({
        error: `Stock insuffisant : demandé ${quantiteDemandee}, disponible ${dispo}`
      });
    }

    inventaire[produitId] = dispo - quantiteDemandee;

    stock.changed('inventaire', true);
    await stock.save();

    const magasin = await Magasin.findByPk(req.params.magasinId);
    if (!magasin) {
      return res.status(404).json({ error: 'Magasin introuvable' });
    }
    
    const invMag = magasin.inventaire || {};

    invMag[produitId] = (invMag[produitId] || 0) + quantiteDemandee;
    magasin.inventaire = invMag;
    magasin.changed('inventaire', true);
    await magasin.save();

    res.json({
      message: `Réapprovisionnement de ${quantiteDemandee} unités OK`,
      nouvelleQuantite: stock.inventaire[produitId],
      inventaire: stock.inventaire
    });
    } catch (err) {
      console.error('Erreur reapprovisionnement:', err);
      res.status(500).json({ error: err.message });
    }
};