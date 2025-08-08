const Vente        = require('../models/vente');
const Magasin      = require('../models/magasin');
const Produit      = require('../models/produit');

exports.afficherTableauBord = async (req, res) => {
  try {
    const ventes = await Vente.findAll({
      attributes: ['MagasinId', 'quantite', 'prixUnitaire'],
      raw: true
    });

    const caMap = {};
    ventes.forEach(({ MagasinId, quantite, prixUnitaire }) => {
      const montant = Number(quantite) * Number(prixUnitaire);
      caMap[MagasinId] = (caMap[MagasinId] || 0) + montant;
    });

    const [magasins, produits] = await Promise.all([
      Magasin.findAll({ attributes: ['id', 'nom'], raw: true }),
      Produit.findAll({ attributes: ['id', 'nom'], raw: true })
    ]);

    const magMap  = Object.fromEntries(magasins.map(m => [m.id, m.nom]));
    const prodMap = Object.fromEntries(produits.map(p => [p.id, p.nom]));

    const caParMagasin = Object.entries(caMap).map(([id, ca]) => ({
      magasinId:     Number(id),
      magasinNom:    magMap[id] || `#${id}`,
      chiffreAffaires: ca.toFixed(2)
    }));

    const stockMags = await Magasin.findAll({ attributes: ['id','inventaire'], raw: true });

    const rupture = [], surstock = [];
    stockMags.forEach(m => {
      for (const [prodId, qte] of Object.entries(m.inventaire || {})) {
        const entry = {
          magasinId:   m.id,
          magasinNom:  magMap[m.id] || `#${m.id}`,
          produitId:   Number(prodId),
          produitNom:  prodMap[prodId] || `#${prodId}`,
          quantite:    qte
        };
        if (qte <= 5)  rupture.push(entry);
        if (qte >= 25) surstock.push(entry);
      }
    });

    res.json({ caParMagasin, rupture, surstock });
  } catch (err) {
    console.error('Erreur affichage tableau de bord :', err);
    res.status(500).json({ error: err.message });
  }
};
