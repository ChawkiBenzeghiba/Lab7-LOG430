const request = require('supertest');
const express = require('express');

jest.mock('../controllers/tableauBordController', () => ({
  afficherTableauBord: (req, res) => {
    return res.status(200).json({
      chiffreAffairesParMagasin: [
        { magasinId: 1, ca: 1000 },
        { magasinId: 2, ca: 1500 }
      ],
      alertesRupture: [],
      produitsSurstock: []
    });
  }
}));

const tableauBordRoutes = require('../routes/tableauBordRoutes');

describe('UC3 – Visualiser les performances des magasins', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', tableauBordRoutes);
  });

  it('GET /tableau-de-bord => indicateurs attendus', async () => {
    const res = await request(app).get('/tableau-de-bord');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('chiffreAffairesParMagasin');
    expect(res.body).toHaveProperty('alertesRupture');
    expect(res.body).toHaveProperty('produitsSurstock');
  });
});
