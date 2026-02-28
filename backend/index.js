const express = require('express');
const path = require('path');
const mymongo = require('./scripts/mongo.js'); 
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Credenziali fornite (da usare sia in locale che in remoto)
const mongoCredentials = {
    user: "site252620",
    pwd: "Oht2Ieyi",
    site: "mongo_site252620"
};

// API per inizializzare il DB (Specifica: "Create data on MongoDB")
app.get('/db/create', async (req, res) => {
    const result = await mymongo.create(mongoCredentials);
    res.send(result);
});

// API per le app (Navigator/Marketplace)
app.get('/db/search', async (req, res) => {
    const result = await mymongo.search(req.query, mongoCredentials);
    res.json(result);
});

// Serve i file statici (il build di React)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(8000, () => console.log("Server running on port 8000"));