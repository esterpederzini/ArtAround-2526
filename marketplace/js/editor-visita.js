/* ═══════════════════════════════════════════════════
   editor-visita.js – Logica Editor Visita ArtAround
   ═══════════════════════════════════════════════════ */

var itemsNelPercorso = itemsNelPercorso || [];
var tuttiItems = tuttiItems || [];
var dragSrc = dragSrc || null;

// ─── INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Sincronizza lo stato visivo della navbar globale usando utils.js
  aggiornaUtenteUI();

  configMuseo = await caricaConfigMuseo();
  const utente = getUtenteCorrente();

  // Se l'utente non ha fatto il login (è un ospite anonimo)
  if (!utente) {
    document.body.classList.add("overflow-hidden");
    document.body.innerHTML = `
      <div class="d-flex flex-column justify-content-center align-items-center vh-100 w-100"
           style="background: linear-gradient(135deg, var(--aa-ink) 0%, var(--aa-charcoal) 60%, #3d4a5c 100%); color: var(--aa-cream); margin: 0; padding: 2rem;">
        <div class="text-center col-md-8 col-lg-6" style="transform: translateY(-20px);">
          <div style="font-size: 5rem; margin-bottom: 1rem;">🗺️</div>
          <h2 style="color: var(--aa-museum-primary); font-family: 'Garamond', 'Georgia', serif; font-size: 2.5rem; font-weight: 600;">
            Crea il tuo percorso su misura!
          </h2>
          <p class="lead mt-3" style="color: rgba(255, 255, 255, 0.75);">
            Vuoi diventare un curatore virtuale e progettare la tua visita museale perfetta per ${configMuseo ? configMuseo.museo : "il museo"}?
          </p>
          <p class="mb-4" style="color: rgba(255, 255, 255, 0.65);">
            Devi effettuare l'accesso per poter mescolare i contenuti del catalogo, creare il tuo itinerario e modificarlo quando vuoi.
          </p>
          <button class="btn-aa-gold mt-2" onclick="apriLogin()">
            <i class="bi bi-person"></i> Accedi ora
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (configMuseo && configMuseo.museo) {
    const inputMuseo = document.getElementById("visitaMuseo");
    if (inputMuseo) {
      inputMuseo.value = configMuseo.museo;
    }
  }

  await popolaMusei();
  await caricaAutori();
  await caricaTuttiItems();

  applicaRestrizioniVisitatore();

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) caricaVisitaPerModifica(params.get("id"));

  document.getElementById("cercaCatalogo")?.addEventListener(
    "input",
    debounce((e) => {
      renderCatalogo(e.target.value.trim().toLowerCase());
    }, 250),
  );
  document.getElementById("editorMainContainer")?.classList.remove("d-none");
});

// ─── CARICA DATI ────────────────────────────────────
async function popolaMusei() {
  if (!configMuseo) return;
  const sel = document.getElementById("visitaMuseo");
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleziona museo...</option>';
  const opt = document.createElement("option");
  opt.value = configMuseo.museo;
  opt.textContent = configMuseo.museo;
  sel.appendChild(opt);
  sel.value = configMuseo.museo;
}

async function caricaAutori() {
  const utenti = await apiFetch("/api/utenti");
  const sel = document.getElementById("visitaAutore");
  if (!utenti || !sel) return;
  utenti
    .filter((u) => ["autore", "admin"].includes(u.ruolo))
    .forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u._id;
      opt.textContent = `${u.username} (${u.ruolo})`;
      sel.appendChild(opt);
    });
  const u = getUtenteCorrente();
  if (u) sel.value = u._id;
}

async function caricaTuttiItems() {
  if (!configMuseo) return;
  const data = await apiFetch(
    `/api/items?museo=${encodeURIComponent(configMuseo.museo)}&limite=200&pubblicato=true`,
  );
  tuttiItems = data?.items || [];
  renderCatalogo("");
}

// ─── RENDER CATALOGO ─────────────────────────────────
function renderCatalogo(filtro = "") {
  const container = document.getElementById("catalogoItems");
  if (!container) return;

  let items = tuttiItems.filter(
    (item) => !itemsNelPercorso.some((p) => p.itemId === item._id),
  );

  if (filtro) {
    items = items.filter(
      (i) =>
        i.titolo.toLowerCase().includes(filtro) ||
        (i.titoloOpera && i.titoloOpera.toLowerCase().includes(filtro)) ||
        i.operaId.toLowerCase().includes(filtro) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(filtro)),
    );
  }

  if (!items.length) {
    container.innerHTML =
      '<div class="aa-empty" style="padding:1rem"><p style="font-size:0.8rem">Nessun item disponibile.</p></div>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const giàAggiunto = itemsNelPercorso.some((i) => i.itemId === item._id);
      const subLabel = item.titoloOpera || "Opera";
      return `
      <div class="d-flex align-items-center gap-2 p-2 mb-1 rounded"
           style="border:1px solid var(--aa-stone);background:#fff;transition:background 0.15s"
           onmouseover="this.style.background='var(--aa-cream)'" onmouseout="this.style.background='#fff'">
        <div style="width:36px;height:36px;background:var(--aa-cream-dark);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
          ${iconaCategoriaPiccola(item.categoria)}
        </div>
        <div class="flex-grow-1 min-w-0">
          <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--aa-ink);">${item.titolo}</div>
          
          <div style="font-size:0.75rem; color:var(--aa-slate); display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;">
            <span style="font-weight:600; color:var(--aa-charcoal); font-size:0.78rem;">${subLabel}</span>
            <span style="opacity:0.5;">·</span>
            ${badgeLinguaggio(item.linguaggio)}
            <span style="opacity:0.5;">·</span>
            <span class="badge bg-dark-subtle text-dark-emphasis" style="font-size:0.68rem; font-weight:600; padding:2px 6px; border-radius:4px;">
              <i class="bi bi-clock me-1"></i>${item.lunghezza}
            </span>
          </div>
        </div>
        <button class="btn-aa-outline" 
        style="font-size:0.75rem;padding:3px 10px;flex-shrink:0;${giàAggiunto ? "opacity:0.4;cursor:default" : ""}"
        ${giàAggiunto ? 'disabled title="Già aggiunto"' : `onclick="aggiungiItemAlPercorso('${item._id}')"`}>
        ${giàAggiunto ? "✓" : "+ Aggiungi"}
        </button>
      </div>
    `;
    })
    .join("");
}

function iconaCategoriaPiccola(cat) {
  const m = {
    pittura: "🖼️",
    scultura: "🗿",
    architettura: "🏛️",
    fotografia: "📷",
    arte_moderna: "🎨",
    arte_antica: "🏺",
    decorativa: "🪆",
    altro: "🔍",
  };
  return m[cat] || "🔍";
}

// ─── GESTIONE PERCORSO ───────────────────────────────
function aggiungiItemAlPercorso(itemId) {
  salvaTestoLogisticaCorrente(); // Mantiene il testo digitato prima di ridisegnare

  if (itemsNelPercorso.some((i) => i.itemId === itemId)) {
    showToast("Item già presente nel percorso", "info");
    return;
  }
  const item = tuttiItems.find((i) => i._id === itemId);
  if (!item) return;

  itemsNelPercorso.push({
    itemId: item._id,
    ordine: itemsNelPercorso.length + 1,
    opzionale: false,
    titolo: item.titolo,
    titoloOpera: item.titoloOpera || item.titolo,
    lunghezza: item.lunghezza,
    linguaggio: item.linguaggio,
    categoria: item.categoria,
    immagine: item.immagine,
    logistica: "",
  });

  renderPercorso();
  renderCatalogo(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );
}

function rimuoviItemDalPercorso(itemId) {
  salvaTestoLogisticaCorrente();
  itemsNelPercorso = itemsNelPercorso.filter((i) => i.itemId !== itemId);
  ricalcolaOrdini();
  renderPercorso();
  renderCatalogo(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );
}

function toggleOpzionale(itemId) {
  salvaTestoLogisticaCorrente();
  const item = itemsNelPercorso.find((i) => i.itemId === itemId);
  if (item) {
    item.opzionale = !item.opzionale;
    renderPercorso();
  }
}

function ricalcolaOrdini() {
  itemsNelPercorso.forEach((item, i) => (item.ordine = i + 1));
}

// Sincronizza i testi digitati dentro le textarea con lo stato JavaScript prima dei cambi del DOM
function salvaTestoLogisticaCorrente() {
  document.querySelectorAll(".input-logistica-tappa").forEach((el) => {
    const index = parseInt(el.getAttribute("data-index"), 10);
    if (itemsNelPercorso[index]) {
      itemsNelPercorso[index].logistica = el.value;
    }
  });
}

function renderPercorso() {
  const list = document.getElementById("dndList");
  if (!list) return;

  document.getElementById("countItems").textContent =
    `${itemsNelPercorso.length} item selezionati`;

  const durataMin = itemsNelPercorso.reduce(
    (acc, i) => acc + lunghezzaInMinuti(i.lunghezza),
    0,
  );
  const durataEl = document.getElementById("durataCalcolata");
  if (durataEl) {
    durataEl.textContent = `Durata: ~${Math.round(durataMin)} min`;
  }

  if (!itemsNelPercorso.length) {
    list.innerHTML = `<div class="aa-empty" style="padding:1.5rem"><div class="aa-empty-icon" style="font-size:2rem">📭</div><p class="mb-0" style="font-size:0.85rem">Aggiungi item dal catalogo sottostante per creare il percorso.</p></div>`;
    return;
  }

  list.innerHTML = itemsNelPercorso
    .map((item, index) => {
      const valoreLogistica = item.logistica || "";

      return `
        <div class="aa-dnd-item ${item.opzionale ? "optional-item" : ""}"
             draggable="true"
             data-id="${item.itemId}"
             ondragstart="onDragStart(event)"
             ondragover="onDragOver(event)"
             ondrop="onDrop(event)"
             ondragend="onDragEnd(event)">
          <span class="drag-handle">⠿</span>
          <span class="item-num">${item.ordine}</span>
          <div class="item-info w-100">
            <div class="item-title">${item.titolo}</div>
            <div class="item-meta">
              ${badgeLinguaggio(item.linguaggio)}
              ${badgeLunghezza(item.lunghezza)}
              ${item.opzionale ? '<span class="aa-badge aa-badge-len" style="border-style:dashed">opzionale</span>' : ""}
            </div>
            
            <div class="mt-2 text-start pr-2" style="width: 95%;">
              <label class="text-slate d-block mb-1" style="font-size:0.68rem; font-weight:700; letter-spacing:0.5px;">
                <i class="bi bi-geo-alt-fill text-warning me-1"></i> INDICAZIONI VERSO LA PROSSIMA OPERA
              </label>
              <textarea 
                class="aa-input input-logistica-tappa w-100 p-1" 
                rows="1" 
                placeholder="Es: Svolta a sinistra ed entra nella sala successiva..."
                data-index="${index}"
                style="font-size:0.75rem; border-radius:4px; line-height:1.3; resize:vertical; background:var(--aa-cream); border: 1px solid var(--aa-stone);"
              >${valoreLogistica}</textarea>
            </div>
            </div>
          <div class="d-flex gap-1 ms-auto align-self-start mt-1">
            <button class="btn-aa-outline" style="font-size:0.72rem;padding:2px 8px" 
                    onclick="toggleOpzionale('${item.itemId}')"
                    title="${item.opzionale ? "Rendi obbligatorio" : "Rendi opzionale"}">
              ${item.opzionale ? "⟳" : "○"}
            </button>
            <button class="btn-aa-danger" onclick="rimuoviItemDalPercorso('${item.itemId}')">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ─── DRAG & DROP ─────────────────────────────────────
function onDragStart(e) {
  salvaTestoLogisticaCorrente(); // Mette in cassaforte i testi scritti prima dello spostamento
  dragSrc = e.currentTarget;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragSrc.dataset.id);
  setTimeout(() => dragSrc.classList.add("dragging"), 0);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = e.currentTarget;
  if (target !== dragSrc) target.style.borderTop = "2px solid var(--aa-gold)";
}

function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.style.borderTop = "";
  if (target === dragSrc) return;

  const srcId = dragSrc.dataset.id;
  const tgtId = target.dataset.id;
  const srcIdx = itemsNelPercorso.findIndex((i) => i.itemId === srcId);
  const tgtIdx = itemsNelPercorso.findIndex((i) => i.itemId === tgtId);

  if (srcIdx === -1 || tgtIdx === -1) return;

  const [rimosso] = itemsNelPercorso.splice(srcIdx, 1);
  itemsNelPercorso.splice(tgtIdx, 0, rimosso);
  ricalcolaOrdini();
  renderPercorso();
}

function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document
    .querySelectorAll(".aa-dnd-item")
    .forEach((el) => (el.style.borderTop = ""));
}

function buildTappeFromPath(pathItems) {
  salvaTestoLogisticaCorrente();
  return pathItems.map((i) => {
    const meta =
      tuttiItems.find((x) => String(x._id) === String(i.itemId)) || {};
    return {
      ordine: i.ordine,
      logistica: i.logistica || "",
      item_default: String(i.itemId),
      operaId: meta.operaId || "",
      opzionale: !!i.opzionale,
    };
  });
}

// ─── SALVA VISITA ─────────────────────────────────────
async function salvaVisita() {
  const titolo = document.getElementById("visitaTitolo").value.trim();
  const museo = document.getElementById("visitaMuseo").value;
  const autoreId = document.getElementById("visitaAutore").value;
  const desc = document.getElementById("visitaDescrizione").value.trim();
  const default_image = "/img/default_item_image.jpg";
  const tags = document
    .getElementById("visitaTags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const durata = Number(document.getElementById("visitaDurata").value) || 60;
  const licenza = document.getElementById("visitaLicenza").value;
  const prezzo = Number(document.getElementById("visitaPrezzo").value) || 0;
  const pubblica = document.getElementById("visitaPubblica").checked;
  const id = document.getElementById("visitaId").value;
  const livelloBase =
    document.getElementById("visitaLivelloBase")?.value || "medio";

  if (!titolo || !museo || !autoreId)
    return showToast(
      "Compila i campi obbligatori (Titolo, Museo, Autore)",
      "error",
    );
  if (!itemsNelPercorso.length)
    return showToast("Aggiungi almeno un item al percorso", "error");

  let thumbnail = document.getElementById("visitaImmagine").value.trim();

  if (!thumbnail && itemsNelPercorso.length > 0) {
    const primoItem = tuttiItems.find(
      (i) => i._id === itemsNelPercorso[0].itemId,
    );
    if (primoItem && primoItem.immagine) {
      thumbnail = primoItem.immagine;
    }
  }

  if (!thumbnail) thumbnail = default_image;

  const tappe = buildTappeFromPath(itemsNelPercorso);

  const payload = {
    titolo,
    title: titolo,
    museo,
    descrizione: desc,
    immagine: thumbnail,
    tags,
    durataTotaleStimata: durata,
    livello_base: livelloBase,
    licenza: { tipo: licenza },
    prezzo,
    pubblica,
    creatorId: autoreId,
    stops: itemsNelPercorso.length,
    duration: `${durata} min`,
    tappe,
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `/api/visite/${id}` : "/api/visite";

  if (id) payload._id = id;

  const ok = await apiFetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (ok) {
    showToast(
      id ? "Visita aggiornata!" : "Visita creata con successo!",
      "success",
    );
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  }
}

// ─── CARICA VISITA PER MODIFICA ──────────────────────
async function caricaVisitaPerModifica(id) {
  const v = await apiFetch(`/api/visite/${id}`);
  if (!v) return;

  document.getElementById("visitaId").value = v._id;
  document.getElementById("visitaTitolo").value = v.titolo || v.title || "";
  document.getElementById("visitaMuseo").value = v.museo;
  document.getElementById("visitaDescrizione").value = v.descrizione || "";
  document.getElementById("visitaTags").value = (v.tags || []).join(", ");
  document.getElementById("visitaDurata").value = v.durataTotaleStimata || 60;
  document.getElementById("visitaImmagine").value = v.immagine || "";
  if (document.getElementById("visitaLivelloBase")) {
    document.getElementById("visitaLivelloBase").value =
      v.livello_base || "medio";
  }
  document.getElementById("visitaLicenza").value =
    v.licenza?.tipo || "gratuito";
  document.getElementById("visitaPrezzo").value = v.prezzo || 0;
  document.getElementById("visitaPubblica").checked = v.pubblica;
  document.getElementById("visitaAutore").value =
    v.creatorId?._id || v.creatorId || "";

  const visitLabel = v.titolo || v.title || "Visita";
  document.getElementById("editorTitolo").textContent =
    `Modifica: ${visitLabel}`;

  let rawTappe = Array.isArray(v.tappe) ? v.tappe : [];
  if (rawTappe.length === 0 && Array.isArray(v.items) && v.items.length > 0) {
    rawTappe = v.items.map((row) => ({
      ordine: row.ordine,
      opzionale: row.opzionale,
      item_default: row.itemId?._id || row.itemId,
      logistica: row.logistica || "",
    }));
  }

  itemsNelPercorso = rawTappe.map((t) => {
    const def = t.item_default;
    const itemId =
      def && typeof def === "object" && def._id != null ? def._id : def;
    const pop = def && typeof def === "object" && def.titolo ? def : null;
    const meta =
      pop || tuttiItems.find((x) => String(x._id) === String(itemId)) || {};

    return {
      itemId: String(itemId),
      ordine: t.ordine,
      opzionale: !!t.opzionale,
      titolo: meta.titolo || t.titolo || "–",
      titoloOpera: meta.titoloOpera || meta.titolo || t.titoloOpera || "–",
      lunghezza: meta.lunghezza || "1m",
      linguaggio: meta.linguaggio || "intermedio",
      categoria: meta.categoria || "altro",
      immagine: meta.immagine || null,
      logistica: t.logistica || "",
    };
  });

  itemsNelPercorso.sort(
    (a, b) => (Number(a.ordine) || 0) - (Number(b.ordine) || 0),
  );
  itemsNelPercorso.forEach((row, idx) => {
    row.ordine = idx + 1;
  });

  renderPercorso();
  renderCatalogo(
    document.getElementById("cercaCatalogo")?.value.toLowerCase() || "",
  );

  showToast(`Visita "${visitLabel}" caricata per modifica`, "info");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminaVisita(id) {
  if (!confirm("Eliminare questa visita?")) return;
  const ok = await apiFetch(`/api/visite/${id}`, { method: "DELETE" });
  if (ok !== null) {
    showToast("Visita eliminata", "success");
    resetEditor();
  }
}

function resetEditor() {
  document.getElementById("visitaId").value = "";
  document.getElementById("visitaTitolo").value = "";
  document.getElementById("visitaDescrizione").value = "";
  document.getElementById("visitaTags").value = "";
  document.getElementById("visitaDurata").value = 60;
  document.getElementById("visitaLicenza").value = "gratuito";
  document.getElementById("visitaPrezzo").value = 0;
  document.getElementById("visitaPubblica").checked = false;
  document.getElementById("editorTitolo").textContent = "Nuova Visita";
  document.getElementById("visitaImmagine").value = "";

  const inputMuseo = document.getElementById("visitaMuseo");
  if (inputMuseo && configMuseo) {
    inputMuseo.value = configMuseo.museo;
  }

  const u = getUtenteCorrente();
  if (u) {
    document.getElementById("visitaAutore").value = u._id;
  }

  itemsNelPercorso = [];
  renderPercorso();
  renderCatalogo("");
}

// ─── GESTIONE PERMESSI EDITOR ────────────────────────
function applicaRestrizioniVisitatore() {
  const u = getUtenteCorrente();
  if (!u) return;
  if (["autore", "admin"].includes(u.ruolo)) return;

  const campiDaBloccare = ["visitaPrezzo", "visitaLicenza", "visitaPubblica"];
  campiDaBloccare.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = true;
      el.title = "Solo gli Autori possono modificare questo campo";
      el.style.opacity = "0.7";
      el.style.cursor = "not-allowed";
    }
  });

  const header = document.querySelector(".aa-card-header");
  if (header) {
    const badge = document.createElement("span");
    badge.className = "aa-badge aa-badge-lang-infantile ms-2";
    badge.style.fontSize = "0.7rem";
    badge.innerHTML =
      '<i class="bi bi-info-circle"></i> Modalità Personalizzazione';
    header.appendChild(badge);
  }
}

// Listener in tempo reale per catturare i cambiamenti di testo dentro le logiche logistiche
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("input-logistica-tappa")) {
    const index = parseInt(e.target.getAttribute("data-index"), 10);
    const testoInserito = e.target.value;

    if (itemsNelPercorso[index]) {
      itemsNelPercorso[index].logistica = testoInserito;
    }
  }
});
