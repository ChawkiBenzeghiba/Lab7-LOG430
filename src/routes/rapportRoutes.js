const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapportController');


router.get('/rapport', rapportController.genererRapportJson);

module.exports = router;