const express = require('express');
const router = express.Router({ mergeParams: true });
const tableauBordController = require('../controllers/tableauBordController');

router.get('/tableau-de-bord', tableauBordController.afficherTableauBord);


module.exports = router;