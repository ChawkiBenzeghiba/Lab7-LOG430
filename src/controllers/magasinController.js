const Produit       = require('../models/produit');
const Magasin       = require('../models/magasin');

exports.afficherProduits = async (req, res, next) => {
  try {
    const magasin = await Magasin.findByPk(req.params.id);
    if (!magasin) return res.status(404).json({ error: 'Magasin introuvable' });

    // Pagination
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const { count, rows: produits } = await Produit.findAndCountAll({
      attributes: ['id','nom','categorie','prix'],
      limit,
      offset
    });

    const inv = magasin.inventaire || {};
    const result = produits.map(p => ({
      id:        p.id,
      nom:       p.nom,
      categorie: p.categorie,
      prix:      p.prix,
      quantite:  inv[p.id] || 0
    }));

    res.json({ total: count, produits: result });
  } catch (err) {
    next(err);
  }
};

exports.rechercherProduit = async (req, res) => {
  const magasinId = req.params.id;
  const { nom, categorie } = req.query;
  const where = {};
  if (nom) where.nom = nom;
  if (categorie) where.categorie = categorie;
  // Pagination
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;
  const { count, rows: produits } = await Produit.findAndCountAll({
    where,
    include: {
      model: Magasin,
      where: { id: magasinId }
    },
    limit,
    offset
  });
  res.json({ total: count, produits });
};

exports.enregistrerVente = async (req, res, next) => {
  try {
    const { produitId, quantite } = req.body;
    const magasin = await Magasin.findByPk(req.params.id);
    if (!magasin) return res.status(404).json({ error: 'Magasin introuvable' });

    const inv = { ...magasin.inventaire };  // clone
    const dispo = inv[produitId] || 0;
    if (quantite > dispo) {
      return res.status(400).json({ error: 'Stock insuffisant' });
    }

    inv[produitId] = dispo - quantite;
    magasin.inventaire = inv;
    await magasin.save();

    res.json({ message: 'Vente enregistrée', nouveauStock: inv[produitId] });
  } catch (err) {
    next(err);
  }
};


exports.faireRetour = async (req, res, next) => {
  try {
    const { produitId, quantite } = req.body;
    const magasin = await Magasin.findByPk(req.params.id);
    if (!magasin) return res.status(404).json({ error: 'Magasin introuvable' });

    const inv = { ...magasin.inventaire };
    inv[produitId] = (inv[produitId] || 0) + quantite;
    magasin.inventaire = inv;
    await magasin.save();

    res.json({ message: 'Retour enregistré', nouveauStock: inv[produitId] });
  } catch (err) {
    next(err);
  }
};

exports.recupererMagasin = async (_req, res) => {
  try {
    const liste = await Magasin.findAll();
    res.json(liste);
  } catch (err) {
    console.error('Erreur GET /api/magasins', err);
    res.status(500).json({ error: err.message });
  }
};