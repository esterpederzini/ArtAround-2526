const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const mymongo = require("./scripts/mongo.js");
const apiRouter = require("./routes/api");
const app = express();

global.rootDir = process.cwd();

const mongoCredentials = {
  user: "site252620",
  pwd: "Oht2Ieyi",
  site: "mongo_site252620",
};

const isGocker =
  process.env.USER === "site252620" || process.cwd().includes("site252620");

let mongoURI;

if (isGocker) {
  mongoURI =
    "mongodb://site252620:Oht2Ieyi@localhost:27017/site252620?authSource=admin";
  console.log("1");
} else {
  mongoURI =
    "mongodb+srv://dbArtAround2526:MIeXFqS2A9P8npk5@cluster0.xsxp2c3.mongodb.net/test?retryWrites=true&w=majority";
  console.log("2");
}

// mongoose
//   .connect(mongoURI)
//   .then(() => {
//     console.log(
//       `✅ Mongoose connesso in modalità: ${isGocker ? "GOKER/SSH" : "LOCALE/CASA"}`,
//     );
//   })
//   .catch((err) => {
//     console.error("❌ Errore connessione Mongoose:", err.message);
//   });

if (mongoose.connection.readyState === 0) {
  // 0 significa "scollegato"
  mongoose
    .connect(mongoURI)
    .then(() => {
      console.log(
        `✅ Mongoose connesso in modalità: ${isGocker ? "GOKER/SSH" : "LOCALE/CASA"}`,
      );
    })
    .catch((err) => {
      console.error("❌ Errore connessione Mongoose:", err.message);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRouter);

app.get("/api/config", (req, res) => {
  res.sendFile(path.join(__dirname, "config.json"));
});

app.get("/db/create", async function (req, res) {
  res.send(await mymongo.create(mongoCredentials));
});

app.use("/", express.static(path.join(__dirname, "marketplace")));
app.use("/mobile", express.static(path.join(__dirname, "navigator/dist")));

app.get(/^\/mobile(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "navigator/dist", "index.html"));
});

// 5. AVVIO SERVER
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  global.startDate = new Date();

  const baseURL = isGocker
    ? `https://site252620.tw.cs.unibo.it`
    : `http://localhost:${PORT}`;

  console.log(
    `Server ArtAround avviato il ${global.startDate.toLocaleString()}`,
  );
  console.log(`Marketplace: ${baseURL}/`);
  console.log(`Navigator: ${baseURL}/mobile`);
  console.log(`API Endpoint: ${baseURL}/api/visite`);
});
