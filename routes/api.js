const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/apiController');

// Musei
router.get('/musei', ctrl.getMusei);

// Items
router.get('/items', ctrl.getItems);
router.get('/items/:id', ctrl.getItemById);
router.post('/items', ctrl.creaItem);
router.put('/items/:id', ctrl.aggiornaItem);
router.delete('/items/:id', ctrl.eliminaItem);
router.patch('/items/:id/pubblica', ctrl.pubblicaItem);
router.post('/items/:id/acquista', ctrl.acquistaItem);

// Visite
router.get('/visite', ctrl.getVisite);
router.get('/visite/:id', ctrl.getVisitaById);
router.post('/visite', ctrl.creaVisita);
router.put('/visite/:id', ctrl.aggiornaVisita);
router.delete('/visite/:id', ctrl.eliminaVisita);
router.post('/visite/:id/adotta', ctrl.adottaVisita);

// Utenti
router.get('/utenti', ctrl.getUtenti);
router.post('/auth/login', ctrl.loginUtente);

// Stats & Log
router.get('/stats', ctrl.getStats);
router.get('/log/vendite', ctrl.getLogVendite);

module.exports = router;