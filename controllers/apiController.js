const Item = require("../models/Item");
const Visita = require("../models/Visita");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { createAuthToken } = require("../middleware/auth");
const mm = require("music-metadata");
const path = require("path");
const fs = require("fs");

const risposta = (res, status, data, messaggio = "") => {
  res.status(status).json({ successo: status < 400, messaggio, data });
};

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

async function normalizeVisitPayloadForStorage(body) {
  const out = { ...body };
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

exports.getMusei = async (req, res) => {
  try {
    const musei = await Item.distinct("museo");
    risposta(res, 200, musei);
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

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
      operaId,
      lunghezza,
      pagina = 1,
      limite = 20,
      pubblicato = "true",
    } = req.query;

    const filtro = {};
    if (museo) filtro.museo = museo;
    if (linguaggio) filtro.linguaggio = linguaggio;
    if (categoria) filtro.categoria = categoria;
    if (operaId) filtro.operaId = operaId;
    if (lunghezza) filtro.lunghezza = lunghezza;
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
    const utente = await User.findById(creatorId);
    if (!utente || !["autore", "admin"].includes(utente.ruolo)) {
      return risposta(
        res,
        403,
        null,
        "Solo gli autori possono creare contenuti",
      );
    }

    const datiNuovoItem = { ...req.body };

    delete datiNuovoItem._id;
    delete datiNuovoItem.id;

    datiNuovoItem.creatorId = creatorId;
    datiNuovoItem.autore = utente.username;
    datiNuovoItem.autore_visita = utente.username;

    const item = await Item.create(datiNuovoItem);

    risposta(res, 201, item, "Item creato con successo");
  } catch (err) {
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
    const itemId = req.params.id;

    const item = await Item.findById(itemId);
    if (!item) return risposta(res, 404, null, "Item non trovato");

    const tipoTransazione = item.prezzo > 0 ? "acquisto" : "adozione";
    const nuovoLog = {
      acquirenteId,
      prezzo: item.prezzo || 0,
      tipo: tipoTransazione,
      dataAcquisto: new Date(),
    };

    const itemAggiornato = await Item.findByIdAndUpdate(
      itemId,
      { $push: { logVendite: nuovoLog } },
      { new: true, runValidators: false },
    );

    await User.findByIdAndUpdate(acquirenteId, {
      $push: {
        acquistiEffettuati: { itemId: item._id, prezzo: item.prezzo || 0 },
      },
    });

    risposta(res, 200, itemAggiornato, "Operazione registrata con successo");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.getVisite = async (req, res) => {
  try {
    const { museo, creatorId, soloMie, pagina = 1, limite = 12 } = req.query;
    const utenteId = req.auth?.sub;

    const filtro = {};
    if (museo) filtro.museo = museo;
    if (creatorId) filtro.creatorId = creatorId;

    if (soloMie === "true" && utenteId) {
      const utente = await User.findById(utenteId).select("visiteSalvate");
      if (utente) {
        filtro._id = { $in: utente.visiteSalvate };
      }
    }

    const skip = (Number(pagina) - 1) * Number(limite);

    const [visiteDocs, totale] = await Promise.all([
      Visita.find(filtro)
        .populate("creatorId", "username")
        .populate({
          path: "logAdozioni.adottanteId",
          select: "username",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limite))
        .lean(),
      Visita.countDocuments(filtro),
    ]);

   
 
    const visite = await Promise.all(
      visiteDocs.map(async (v) => {
        if (v.tappe && Array.isArray(v.tappe)) {
          v.tappe = await Promise.all(
            v.tappe.map(async (tappa) => {
          
              if (
                !tappa.item_default ||
                typeof tappa.item_default !== "object"
              ) {
                const codiceCercato = tappa.operaId || "";
                const linguaggioVisita = v.livello_base || "medio";  

                const itemReale = await Item.findOne({
                  operaId: codiceCercato,
                  museo: v.museo,
                  linguaggio: linguaggioVisita,
                }).lean();

                if (itemReale) {
                  tappa.item_default = itemReale;
                } else {
                 
                  const fallbackItem = await Item.findOne({
                    operaId: codiceCercato,
                  }).lean();
                  tappa.item_default = fallbackItem || {
                    titolo: tappa.logistica
                      ? tappa.logistica.substring(0, 45) + "..."
                      : `Tappa ${tappa.ordine}`,
                    operaId: codiceCercato || `OP-${tappa.ordine}`,
                    lunghezza: "15s",
                    linguaggio: "medio",
                  };
                }
              }
              return tappa;
            }),
          );
        }
        return v;
      }),
    );

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
          "titolo operaId lunghezza linguaggio url descrizione autore categoria prezzo licenza audioUrl periodo stile mappa_x mappa_y piano",
      });

    if (!visita) return risposta(res, 404, null, "Visita non trovata");

    const visitaObj = visita.toObject();

    if (visitaObj.tappe && Array.isArray(visitaObj.tappe)) {
      for (let tappa of visitaObj.tappe) {
        if (!tappa.item_default && tappa.operaId) {
          const linguaggioCercato =
            tappa.linguaggio_default || visitaObj.livello_base || "medio";
          const lunghezzaCercata = tappa.lunghezza_default || "15s";

          const itemTrovato = await Item.findOne({
            operaId: tappa.operaId,
            linguaggio: linguaggioCercato,
            lunghezza: lunghezzaCercata,
          })
            .select(
              "titolo operaId lunghezza linguaggio url descrizione autore categoria prezzo licenza audioUrl periodo stile mappa_x mappa_y piano",
            )
            .lean();

          if (itemTrovato) {
            tappa.item_default = itemTrovato;
          } else {
            const fallbackItem = await Item.findOne({
              operaId: tappa.operaId,
            }).lean();
            if (fallbackItem) {
              tappa.item_default = fallbackItem;
            }
          }
        }

        if (!tappa.item_default || !tappa.item_default.audioUrl) continue;

        try {
          const audioFileName = tappa.item_default.audioUrl.split("/").pop();

          const audioFilePath = path.join(
            process.cwd(),
            "navigator",
            "public",
            "audio",
            audioFileName,
          );

          if (fs.existsSync(audioFilePath)) {
            const metadata = await mm.parseFile(audioFilePath);
            tappa.item_default.durata_reale = Math.round(
              metadata.format.duration,
            );
          }
        } catch (audioErr) {
          console.error("Errore lettura metadati audio:", audioErr.message);
        }
      }
    }

    risposta(res, 200, visitaObj);
  } catch (err) {
    console.error("ERRORE CRITICO getVisitaById:", err.message);
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
    risposta(res, 500, null, err.message);
  }
};

exports.aggiornaVisita = async (req, res) => {
  try {
    const payload = await normalizeVisitPayloadForStorage({ ...req.body });
    const mongoUpdate = { $set: payload };
    if (Object.prototype.hasOwnProperty.call(payload, "tappe")) {
      mongoUpdate.$unset = { items: "" };
    }
    const visita = await Visita.findByIdAndUpdate(req.params.id, mongoUpdate, {
      new: true,
      runValidators: true,
    });
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

    visita.logAdozioni.push({ adottanteId, prezzo: visita.prezzo || 0 });
    await visita.save();

    await User.findByIdAndUpdate(adottanteId, {
      $addToSet: { visiteSalvate: visita._id },
    });
    risposta(res, 200, visita, "Visita adottata");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

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
    const identifier = (username || "").trim();
    const utente = await User.findOne({
      $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
    });
    if (!utente) return risposta(res, 401, null, "Utente non trovato");

    let passwordValida = false;
    if (utente.password && utente.password.startsWith("$2")) {
      passwordValida = await bcrypt.compare(password, utente.password);
    } else {
      passwordValida = utente.password === password;
      if (passwordValida) {
        const nuovoHash = await bcrypt.hash(password, 12);
        await User.updateOne(
          { _id: utente._id },
          { $set: { password: nuovoHash } },
        );
        utente.password = nuovoHash;
      }
    }

    if (!passwordValida) return risposta(res, 401, null, "Password errata");
    const token = createAuthToken(utente);
    risposta(res, 200, { user: utente.toJSON(), token }, "Login effettuato");
  } catch (err) {
    risposta(res, 500, null, err.message);
  }
};

exports.registraUtente = async (req, res) => {
  try {
    const { username, email, password, ruolo } = req.body;
    if (!username || !email || !password) {
      return risposta(res, 400, null, "Parametri di registrazione incompleti");
    }

    const utenteEsistente = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.toLowerCase().trim() },
      ],
    });

    if (utenteEsistente) {
      const messaggioErrore =
        utenteEsistente.username === username.trim()
          ? "Questo username è già utilizzato da un altro utente"
          : "Questa email risulta già iscritta alla piattaforma";
      return risposta(res, 400, null, messaggioErrore);
    }

  
    const ruoloValido = ["visitatore", "autore"].includes(ruolo)
      ? ruolo
      : "visitatore";

    const nuovoUtente = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, 
      ruolo: ruoloValido,
    });

    await nuovoUtente.save();

    const token = createAuthToken(nuovoUtente);
    const utenteOutput = nuovoUtente.toJSON();

    return res.status(201).json({
      successo: true,
      messaggio: "Utente registrato correttamente",
      data: { user: utenteOutput, token },
    });
  } catch (err) {
    console.error("Errore registrazione:", err);
    return risposta(res, 500, null, err.message);
  }
};

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
