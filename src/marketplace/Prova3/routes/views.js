const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
router.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));
router.get('/editor-visita', (req, res) => res.sendFile(path.join(__dirname, '../public/editor-visita.html')));
router.get('/editor-item', (req, res) => res.sendFile(path.join(__dirname, '../public/editor-item.html')));

module.exports = router;