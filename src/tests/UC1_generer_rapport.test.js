const request = require('supertest');
const express = require('express');

jest.mock('../controllers/rapportController', () => ({
  genererRapportJson: (req, res) => {
    return res.json({
      ventesParMagasin: [],
      topVentes: [],
      stocksRestants: []
    });
  }
}));

const rapportRoutes = require('../routes/rapportRoutes');

const app = express();
app.use(express.json());
app.use('/', rapportRoutes);

describe('UC1 - Générer un rapport consolidé des ventes', () => {
  it('devrait retourner un rapport JSON avec ventes, top ventes et stocks restants', async () => {
    const res = await request(app).get('/rapport');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ventesParMagasin');
    expect(res.body).toHaveProperty('topVentes');
    expect(res.body).toHaveProperty('stocksRestants');
  });
});