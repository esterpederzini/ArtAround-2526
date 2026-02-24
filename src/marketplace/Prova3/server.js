require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const apiRoutes = require('./routes/api');
const viewRoutes = require('./routes/views');

app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connesso su:', process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Server ArtAround in ascolto su http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Errore connessione MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;