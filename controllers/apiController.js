const Item = require("../models/Item");
const Visita = require("../models/Visita");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { createAuthToken } = require("../middleware/auth");

// ─── UTILITY ────────────────────────────────────────────────
const risposta = (res, status, data, messaggio = "") => {
  res.status(status).json({ successo: status < 400, messaggio, data });
};

/**
 * Navigator and seed data use `tappe[].item_default` (Item id) + optional `operaId`.
 * Legacy marketplace saves sent `items[]` instead — convert that shape here.
 */
async function buildTappeFromEditorItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => (Number(a.ordine) || 0) - (Number(b.ordine) || 0),
  );
  const tappe = [];
  let fallbackOrder = 1;
  for (const row of sorted) {
    if (!row.itemId) continue;
    const idStr = String(row.itemId);
    const itemDoc = await Item.findById(idStr).select("operaId").lean();
    const operaId = itemDoc?.operaId || row.operaId || "";
    tappe.push({
      ordine: row.ordine != null ? Number(row.ordine) : fallbackOrder,
      logistica: row.logistica || "",
      item_default: idStr,
      operaId,
      opzionale: !!row.opzionale,
    });
    fallbackOrder += 1;
  }
  return tappe.length ? tappe : null;
}

/**
 * Ensure every tappa has `operaId` (Navigator reads tappa.operaId before populate).
 */
async function enrichTappeWithOperaIds(tappe) {
  if (!Array.isArray(tappe) || !tappe.length) return tappe;
  const out = [];
  for (const row of tappe) {
    const idStr = String(row.item_default ?? "");
    let operaId = row.operaId || "";
    if (idStr && !operaId) {
      const doc = await Item.findById(idStr).select("operaId").lean();
      operaId = doc?.operaId || "";
    }
    out.push({
      ...row,
      ordine: row.ordine != null ? Number(row.ordine) : out.length + 1,
      logistica: row.logistica ?? "",
      item_default: idStr,
      operaId,
    });
  }
  return out;
}

/**
 * Prepare visit payload for Mongo: merge `items` → `tappe`, enrich opera ids, drop legacy `items`.
 */
async function normalizeVisitPayloadForStorage(body) {
  const out = { ...body };
  // Legacy: editor used `items`; keep converting until all clients send `tappe` only.
  if (Array.isArray(out.items) && out.items.length > 0) {
    const built = await buildTappeFromEditorItems(out.items);
    if (built) {
      out.tappe = built;
      delete out.items;
    }
  }
  if (Array.isArray(out.tappe) && out.tappe.length > 0) {
    out.tappe = await enrichTappeWithOperaIds(out.tappe);
  }
  return out;
}

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
      operaId, // ADDED: support for operaId filtering
      lunghezza, // ADDED: support for length filtering
      pagina = 1,
      limite = 20,
      pubblicato = "true",
    } = req.query;

    const filtro = {};
    if (museo) filtro.museo = museo;
    if (linguaggio) filtro.linguaggio = linguaggio;
    if (categoria) filtro.categoria = categoria;
    if (operaId) filtro.operaId = operaId; // ADDED to filter
    if (lunghezza) filtro.lunghezza = lunghezza; // ADDED to filter

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
    const creatorId = req.auth?.sub;
    const { creatorId: _, ...resto } = req.body;

    // 1. Verifica che l'utente esista e abbia i permessi
    const utente = await User.findById(creatorId);
    if (!utente || !["autore", "admin"].includes(utente.ruolo)) {
      return risposta(
        res,
        403,
        null,
        "Solo gli autori possono creare contenuti",
      );
    }

    // 2. CREIAMO L'OGGETTO DA SALVARE
    // Aggiungiamo esplicitamente 'autore' usando lo username dell'utente loggato
    const datiNuovoItem = {
      ...resto,
      creatorId: creatorId,
      autore: utente.username,
    };

    const item = await Item.create(datiNuovoItem);
    
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
    const acquirenteId = req.auth?.sub;
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
    const { museo, creatorId, pagina = 1, limite = 12 } = req.query;

    const filtro = {};
    if (museo) filtro.museo = museo;
    if (creatorId) filtro.creatorId = creatorId;
    // Commentiamo il filtro pubblica se non lo hai inserito in tutti i documenti su Atlas
    // if (pubblica !== "tutti") filtro.pubblica = pubblica === "true";

    const skip = (Number(pagina) - 1) * Number(limite);

    const [visite, totale] = await Promise.all([
      Visita.find(filtro)
        .populate("creatorId", "username")
        .populate({
          path: "tappe.item_default", // PERCORSO CORRETTO (Atlas)
          select: "titolo operaId lunghezza linguaggio url autore audioUrl", // 'url' invece di 'immagine'
        })
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
    console.error("Errore getVisite:", err.message);
    risposta(res, 500, null, err.message);
  }
};

exports.getVisitaById = async (req, res) => {
  try {
    const visita = await Visita.findOne({
      $or: [{ _id: req.params.id }, { id: req.params.id }],
    })
      .populate("creatorId", "username email")
      .populate({
        path: "tappe.item_default",
        model: "Item",
        select:
          "titolo operaId lunghezza linguaggio url descrizione autore categoria prezzo licenza audioUrl",
      });

    if (!visita) {
      return risposta(res, 404, null, "Visita non trovata");
    }

    // Restituiamo i dati nel formato atteso dal frontend
    risposta(res, 200, visita);
  } catch (err) {
    console.error("ERRORE BACKEND getVisitaById:", err.message);
    risposta(res, 500, null, err.message);
  }
};

exports.creaVisita = async (req, res) => {
  try {
    const payload = await normalizeVisitPayloadForStorage({ ...req.body });
    const visita = await Visita.create({
      ...payload,
      creatorId: req.auth?.sub,
    });
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
    const payload = await normalizeVisitPayloadForStorage({ ...req.body });
    const mongoUpdate = { $set: payload };
    // Stop stale `items` from shadowing `tappe` after migration to tappe-only saves.
    if (Object.prototype.hasOwnProperty.call(payload, "tappe")) {
      mongoUpdate.$unset = { items: "" };
    }
    const visita = await Visita.findByIdAndUpdate(
      req.params.id,
      mongoUpdate,
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
    const adottanteId = req.auth?.sub;
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
    // Rimuoviamo spazi iniziali/finali dall'identificatore
    const identifier = (username || "").trim();

    // Cerchiamo l'utente per username o email (case-insensitive per email)
    const utente = await User.findOne({
      $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
    });

    if (!utente) return risposta(res, 401, null, "Utente non trovato");

    let passwordValida = false;

    if (utente.password && utente.password.startsWith("$2")) {
      // La password è già hashata con bcrypt: confronto sicuro
      passwordValida = await bcrypt.compare(password, utente.password);
    } else {
      // Migrazione automatica: la password è ancora in chiaro (es. seed senza hash).
      // Confrontiamo in chiaro e, se corretta, la hashiamo e salviamo subito.
      // Usiamo utente.updateOne per evitare di ri-triggerare il pre-save hook
      // (che hasherebbe di nuovo una password già in chiaro).
      passwordValida = utente.password === password;
      if (passwordValida) {
        const nuovoHash = await bcrypt.hash(password, 12);
        // Aggiorniamo direttamente nel DB senza passare per il pre-save hook
        await User.updateOne({ _id: utente._id }, { $set: { password: nuovoHash } });
        utente.password = nuovoHash; // aggiorniamo anche l'oggetto in memoria
      }
    }

    if (!passwordValida) {
      return risposta(res, 401, null, "Password errata");
    }

    // Generiamo il token JWT e restituiamo i dati utente (senza password)
    const token = createAuthToken(utente);
    risposta(
      res,
      200,
      { user: utente.toJSON(), token },
      "Login effettuato",
    );
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
