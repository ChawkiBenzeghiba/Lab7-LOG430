const express       = require('express');
const router        = express.Router();
const stockController = require('../controllers/stockController');

router.get('/stock-central', stockController.afficherStock);

router.post('/:magasinId/reapprovisionnement', stockController.retirerDuStock);

module.exports = router;