const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. CONNESSIONE AL DATABASE (usa i dati del file .env)
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/artaround";
mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ Connesso a MongoDB con successo"))
  .catch((err) => console.error("❌ Errore connessione MongoDB:", err));

// 2. COLLEGAMENTO ROTTE API (quelle che abbiamo messo in routes/api.js)
const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

// 3. GESTIONE FRONTEND (Le tue due scatole)

// Marketplace & Editor (Vanilla JS della tua amica)
// Se vai su http://localhost:8000/ vedi la sua parte
app.use("/", express.static(path.join(__dirname, "marketplace")));

// Navigator (Tua App React)
// Se vai su http://localhost:8000/mobile vedi la tua parte
app.use("/mobile", express.static(path.join(__dirname, "navigator/dist")));

// Fallback per React (necessario se usi React Router)
app.get(/^\/mobile(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "navigator/dist", "index.html"));
});

// AVVIO SERVER
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server ArtAround in esecuzione!`);
  console.log(`📍 Marketplace: http://localhost:${PORT}/`);
  console.log(`📍 Navigator (React): http://localhost:${PORT}/mobile`);
});
