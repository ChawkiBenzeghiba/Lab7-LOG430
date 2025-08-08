const Produit      = require('../models/produit');
const Magasin      = require('../models/magasin');
const Vente        = require('../models/vente');
const StockCentral = require('../models/stockCentral');

exports.genererRapportJson = async (req, res) => {
  try {
    const [produits, ventes, stockCentral] = await Promise.all([
      Produit.findAll({ attributes: ['id','nom','prix'], raw: true }),
      Vente.findAll({ include: [Produit, Magasin], raw: true }),
      StockCentral.findOne({ raw: true })
    ]);

    const ventesParMagasin = {};
    ventes.forEach(v => {
      const magNom = v['Magasin.nom'];
      const prodNom= v['Produit.nom'];
      const ca = v.quantite * v['Produit.prix'];

      ventesParMagasin[magNom] ??= {};
      const entry = ventesParMagasin[magNom][prodNom] ??= { quantite: 0, ca: 0 };

      entry.quantite += v.quantite;
      entry.ca += ca;
    });

    const quantiteVendue = {};
    ventes.forEach(v => {
      const prodNom = v['Produit.nom'];
      quantiteVendue[prodNom] = (quantiteVendue[prodNom] || 0) + v.quantite;
    });

    const topVentes = Object.entries(quantiteVendue)
      .sort(([,qA], [,qB]) => qB - qA)
      .slice(0, 3)
      .map(([produit, quantiteVendue]) => ({ produit, quantiteVendue }));
 
    const stocksRestants = {};
    produits.forEach(p => {
      const qteCentral = stockCentral.inventaire[p.id] || 0;
      stocksRestants[p.nom] = qteCentral;
    });

    res.json({
      ventesParMagasin,
      topVentes,
      stocksRestants
    });
  } catch (err) {
    console.error('Erreur dans générerRapportJson:', err);
    res.status(500).json({ error: err.message });
  }
};