const express       = require('express');
const router        = express.Router({ mergeParams: true });
const magasinController = require('../controllers/magasinController');



router.get('/:id/produits', magasinController.afficherProduits);

router.get('/:id/produits/search', magasinController.rechercherProduit);

router.post('/:id/vente', magasinController.enregistrerVente);

router.post('/:id/retour', magasinController.faireRetour);

router.get('/magasins', magasinController.recupererMagasin);

module.exports = router;
