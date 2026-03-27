const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/apiController");
const { requireAuth, requireRole } = require("../middleware/auth");

// Musei
router.get("/musei", ctrl.getMusei);

// Items
router.get("/items", ctrl.getItems);
router.get("/items/:id", ctrl.getItemById);
router.post("/items", requireAuth, requireRole("autore", "admin"), ctrl.creaItem);
router.put("/items/:id", requireAuth, requireRole("autore", "admin"), ctrl.aggiornaItem);
router.delete("/items/:id", requireAuth, requireRole("autore", "admin"), ctrl.eliminaItem);
router.patch("/items/:id/pubblica", requireAuth, requireRole("autore", "admin"), ctrl.pubblicaItem);
router.post("/items/:id/acquista", requireAuth, ctrl.acquistaItem);

// Visite
router.get("/visite", ctrl.getVisite);
router.get("/visite/:id", ctrl.getVisitaById);
router.post("/visite", requireAuth, requireRole("autore", "admin"), ctrl.creaVisita);
router.put("/visite/:id", requireAuth, requireRole("autore", "admin"), ctrl.aggiornaVisita);
router.delete("/visite/:id", requireAuth, requireRole("autore", "admin"), ctrl.eliminaVisita);
router.post("/visite/:id/adotta", requireAuth, ctrl.adottaVisita);

// Utenti
router.get("/utenti", requireAuth, requireRole("autore", "admin"), ctrl.getUtenti);
router.post("/login", ctrl.loginUtente);

// Stats & Log
router.get("/stats", ctrl.getStats);
router.get("/log/vendite", requireAuth, requireRole("autore", "admin"), ctrl.getLogVendite);

module.exports = router;
