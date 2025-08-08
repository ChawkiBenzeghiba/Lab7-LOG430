const request = require('supertest');
const express = require('express');

jest.mock('../controllers/stockController', () => ({
  afficherStock: (req, res) => {
    return res.status(200).json([
      { produitId: 1, nom: 'Produit A', quantite: 100 },
      { produitId: 2, nom: 'Produit B', quantite: 50 }
    ]);
  },
  retirerDuStock: (req, res) => {
    return res.status(200).json({ message: 'Réapprovisionnement effectué avec succès' });
  }
}));

const stockRoutes = require('../routes/stockRoutes');

describe('UC2 – Consulter le stock central et réapprovisionnement', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', stockRoutes);
  });

  it('GET  /stock-central => liste des produits avec quantités', async () => {
    const res = await request(app).get('/stock-central');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('produitId');
    expect(res.body[0]).toHaveProperty('quantite');
  });

  it('POST /:magasinId/reapprovisionnement => message de succès', async () => {
    const res = await request(app)
      .post('/42/reapprovisionnement')
      .send({ produitId: 1, quantite: 20 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Réapprovisionnement effectué avec succès');
  });
});
