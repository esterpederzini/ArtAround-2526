const Item = require("../models/Item");
const Visita = require("../models/Visita");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// ─── UTILITY ────────────────────────────────────────────────
const risposta = (res, status, data, messaggio = "") => {
  res.status(status).json({ successo: status < 400, messaggio, data });
};

// ─── MUSEI ──────────────────────────────────────────────────
exports.getMusei = async (req, res) => {
  try {
    const musei = await Item.distinct("museo");
    risposta(res, 200, musei);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

// ─── ITEMS ──────────────────────────────────────────────────
exports.getItems = async (req, res) => {
  try {
    const {
      museo,
      linguaggio,
      categoria,
      licenza,
      minPrezzo,
      maxPrezzo,
      cerca,
      pagina = 1,
      limite = 20,
      pubblicato = "true",
    } = req.query;

    const filtro = {};
    if (museo) filtro.museo = museo;
    if (linguaggio) filtro.linguaggio = linguaggio;
    if (categoria) filtro.categoria = categoria;
    if (licenza) filtro["licenza.tipo"] = licenza;
    if (pubblicato !== "tutti") filtro.pubblicato = pubblicato === "true";
    if (minPrezzo !== undefined || maxPrezzo !== undefined) {
      filtro.prezzo = {};
      if (minPrezzo) filtro.prezzo.$gte = Number(minPrezzo);
      if (maxPrezzo) filtro.prezzo.$lte = Number(maxPrezzo);
    }
    if (cerca) {
      filtro.$or = [
        { titolo: { $regex: cerca, $options: "i" } },
        { operaId: { $regex: cerca, $options: "i" } },
        { autore: { $regex: cerca, $options: "i" } },
        { tags: { $in: [new RegExp(cerca, "i")] } },
      ];
    }

    const skip = (Number(pagina) - 1) * Number(limite);
    const [items, totale] = await Promise.all([
      Item.find(filtro)
        .populate("creatorId", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limite)),
      Item.countDocuments(filtro),
    ]);

    risposta(res, 200, {
      items,
      totale,
      pagina: Number(pagina),
      pagine: Math.ceil(totale / Number(limite)),
    });
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      "creatorId",
      "username",
    );
    if (!item) return risposta(res, 404, null, "Item non trovato");
    risposta(res, 200, item);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.creaItem = async (req, res) => {
  try {
    const { creatorId, ...resto } = req.body;

    // Verifica autore
    const utente = await User.findById(creatorId);
    if (!utente || !["autore", "admin"].includes(utente.ruolo)) {
      return risposta(
        res,
        403,
        null,
        "Solo gli autori possono creare contenuti",
      );
    }

    const item = await Item.create({ ...resto, creatorId });
    risposta(res, 201, item, "Item creato con successo");
  } catch (err) {
    if (err.name === "ValidationError") {
      return risposta(
        res,
        400,
        null,
        Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      );
    }
    risposta(res, 500, null, err.message);
  }
};

exports.aggiornaItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!item) return risposta(res, 404, null, "Item non trovato");
    risposta(res, 200, item, "Item aggiornato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.eliminaItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return risposta(res, 404, null, "Item non trovato");
    risposta(res, 200, null, "Item eliminato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.pubblicaItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { pubblicato: true },
      { new: true },
    );
    if (!item) return risposta(res, 404, null, "Item non trovato");
    risposta(res, 200, item, "Item pubblicato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.acquistaItem = async (req, res) => {
  try {
    const { acquirenteId } = req.body;
    const item = await Item.findById(req.params.id);
    if (!item) return risposta(res, 404, null, "Item non trovato");

    const logEntry = { acquirenteId, prezzo: item.prezzo, tipo: "acquisto" };
    item.logVendite.push(logEntry);
    await item.save();

    await User.findByIdAndUpdate(acquirenteId, {
      $push: { acquistiEffettuati: { itemId: item._id, prezzo: item.prezzo } },
    });

    risposta(res, 200, item, "Acquisto registrato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

// ─── VISITE ─────────────────────────────────────────────────
exports.getVisite = async (req, res) => {
  try {
    const {
      museo,
      creatorId,
      pubblica = "true",
      pagina = 1,
      limite = 12,
    } = req.query;
    const filtro = {};
    if (museo) filtro.museo = museo;
    if (creatorId) filtro.creatorId = creatorId;
    if (pubblica !== "tutti") filtro.pubblica = pubblica === "true";

    const skip = (Number(pagina) - 1) * Number(limite);
    const [visite, totale] = await Promise.all([
      Visita.find(filtro)
        .populate("creatorId", "username")
        .populate(
          "items.itemId",
          "titolo operaId lunghezza linguaggio immagine",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limite)),
      Visita.countDocuments(filtro),
    ]);

    risposta(res, 200, {
      visite,
      totale,
      pagina: Number(pagina),
      pagine: Math.ceil(totale / Number(limite)),
    });
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.getVisitaById = async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id)
      .populate("creatorId", "username email")
      .populate({
        path: "items.itemId",
        select:
          "titolo operaId lunghezza linguaggio immagine descrizione autore categoria prezzo licenza",
      });
    if (!visita) return risposta(res, 404, null, "Visita non trovata");
    risposta(res, 200, visita);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.creaVisita = async (req, res) => {
  try {
    const visita = await Visita.create(req.body);
    risposta(res, 201, visita, "Visita creata con successo");
  } catch (err) {
    if (err.name === "ValidationError") {
      return risposta(
        res,
        400,
        null,
        Object.values(err.errors)
          .map((e) => e.message)
          .join(", "),
      );
    }
    risposta(res, 500, null, err.message);
  }
};

exports.aggiornaVisita = async (req, res) => {
  try {
    const visita = await Visita.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!visita) return risposta(res, 404, null, "Visita non trovata");
    risposta(res, 200, visita, "Visita aggiornata");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.eliminaVisita = async (req, res) => {
  try {
    const visita = await Visita.findByIdAndDelete(req.params.id);
    if (!visita) return risposta(res, 404, null, "Visita non trovata");
    risposta(res, 200, null, "Visita eliminata");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.adottaVisita = async (req, res) => {
  try {
    const { adottanteId } = req.body;
    const visita = await Visita.findById(req.params.id);
    if (!visita) return risposta(res, 404, null, "Visita non trovata");

    visita.logAdozioni.push({ adottanteId, prezzo: visita.prezzo });
    await visita.save();

    await User.findByIdAndUpdate(adottanteId, {
      $addToSet: { visiteSalvate: visita._id },
    });

    risposta(res, 200, visita, "Visita adottata");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

// ─── UTENTI ─────────────────────────────────────────────────
exports.getUtenti = async (req, res) => {
  try {
    const utenti = await User.find({}, "-password");
    risposta(res, 200, utenti);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.loginUtente = async (req, res) => {
  try {
    const { username, password } = req.body;
    const utente = await User.findOne({ username });
    if (!utente) return risposta(res, 401, null, "Credenziali non valide");

    const match = await utente.comparePassword(password);
    if (!match) return risposta(res, 401, null, "Credenziali non valide");

    risposta(res, 200, utente.toJSON(), "Login effettuato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

// ─── LOG & STATS ────────────────────────────────────────────
exports.getLogVendite = async (req, res) => {
  try {
    const items = await Item.find({ "logVendite.0": { $exists: true } })
      .populate("logVendite.acquirenteId", "username")
      .select("titolo operaId museo logVendite prezzo");
    risposta(res, 200, items);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totItems, totVisite, totUtenti, itemsGratuiti, itemsAPagamento] =
      await Promise.all([
        Item.countDocuments({ pubblicato: true }),
        Visita.countDocuments({ pubblica: true }),
        User.countDocuments(),
        Item.countDocuments({ prezzo: 0, pubblicato: true }),
        Item.countDocuments({ prezzo: { $gt: 0 }, pubblicato: true }),
      ]);

    risposta(res, 200, {
      totItems,
      totVisite,
      totUtenti,
      itemsGratuiti,
      itemsAPagamento,
    });
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};
