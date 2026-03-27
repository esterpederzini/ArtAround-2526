/* ═══════════════════════════════════════════════════
   editor-visita.js – Logica Editor Visita ArtAround
   ═══════════════════════════════════════════════════ */

let itemsNelPercorso = []; // [{itemId, ordine, opzionale, ...datiItem}]
let tuttiItems = [];
let dragSrc = null;

// ─── INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  if (!richiedeAutore()) {
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
    return;
  }

  await caricaMusei();
  await caricaAutori();
  await caricaTuttiItems();
  await caricaVisiteList();

  // Query param: modifica visita
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) caricaVisitaPerModifica(params.get("id"));

  // Ricerca catalogo
  document.getElementById("cercaCatalogo")?.addEventListener(
    "input",
    debounce((e) => {
      renderCatalogo(e.target.value.trim().toLowerCase());
    }, 250),
  );
});

// ─── CARICA DATI ────────────────────────────────────
async function caricaMusei() {
  const musei = await apiFetch("/api/musei");
  const sel = document.getElementById("visitaMuseo");
  if (!musei) return;
  musei.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

async function caricaAutori() {
  const utenti = await apiFetch("/api/utenti");
  const sel = document.getElementById("visitaAutore");
  if (!utenti) return;
  utenti
    .filter((u) => ["autore", "admin"].includes(u.ruolo))
    .forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u._id;
      opt.textContent = `${u.username} (${u.ruolo})`;
      sel.appendChild(opt);
    });
  // Pre-seleziona utente loggato
  const u = getUtenteCorrente();
  if (u) sel.value = u._id;
}

async function caricaTuttiItems() {
  const data = await apiFetch("/api/items?limite=200&pubblicato=true");
  tuttiItems = data?.items || [];
  renderCatalogo("");
}

async function caricaVisiteList() {
  const data = await apiFetch("/api/visite?limite=20&pubblica=tutti");
  const list = document.getElementById("visiteList");
  if (!data || !data.visite.length) {
    list.innerHTML = '<em class="text-slate small">Nessuna visita ancora.</em>';
    return;
  }
  list.innerHTML = data.visite
    .map(
      (v) => `
    <div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="border-color:var(--aa-stone)!important">
      <span class="small text-truncate" style="max-width:140px" title="${v.titolo}">${v.titolo}</span>
      <div class="d-flex gap-1">
        <button class="btn-aa-outline" style="font-size:0.72rem;padding:1px 7px" onclick="caricaVisitaPerModifica('${v._id}')">✎</button>
        <button class="btn-aa-danger" style="font-size:0.72rem;padding:1px 6px" onclick="eliminaVisita('${v._id}')">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

// ─── RENDER CATALOGO ─────────────────────────────────
function renderCatalogo(filtro = "") {
  const container = document.getElementById("catalogoItems");
  const items = filtro
    ? tuttiItems.filter(
        (i) =>
          i.titolo.toLowerCase().includes(filtro) ||
          i.operaId.toLowerCase().includes(filtro) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(filtro)),
      )
    : tuttiItems;

  if (!items.length) {
    container.innerHTML =
      '<div class="aa-empty" style="padding:1rem"><p style="font-size:0.8rem">Nessun item trovato.</p></div>';
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const giàAggiunto = itemsNelPercorso.some((i) => i.itemId === item._id);
      return `
      <div class="d-flex align-items-center gap-2 p-2 mb-1 rounded"
           style="border:1px solid var(--aa-stone);background:#fff;transition:background 0.15s"
           onmouseover="this.style.background='var(--aa-cream)'" onmouseout="this.style.background='#fff'">
        <div style="width:36px;height:36px;background:var(--aa-cream-dark);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
          ${iconaCategoriaPiccola(item.categoria)}
        </div>
        <div class="flex-grow-1 min-w-0">
          <div style="font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.titolo}</div>
          <div style="font-size:0.72rem;color:var(--aa-slate)">${item.linguaggio} · ${item.lunghezza} · ${item.operaId}</div>
        </div>
        <button class="btn-aa-outline" style="font-size:0.75rem;padding:3px 10px;flex-shrink:0;${giàAggiunto ? "opacity:0.4;cursor:default" : ""}"
                onclick="${giàAggiunto ? "" : ""}" 
                ${giàAggiunto ? 'disabled title="Già aggiunto"' : ""} 
                onclick="aggiungiItemAlPercorso('${item._id}')">
          ${giàAggiunto ? "✓" : "+ Add"}
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
    lunghezza: item.lunghezza,
    linguaggio: item.linguaggio,
    categoria: item.categoria,
  });

  renderPercorso();
  renderCatalogo(document.getElementById("cercaCatalogo").value.toLowerCase());
}

function rimuoviItemDalPercorso(itemId) {
  itemsNelPercorso = itemsNelPercorso.filter((i) => i.itemId !== itemId);
  ricalcolaOrdini();
  renderPercorso();
  renderCatalogo(document.getElementById("cercaCatalogo").value.toLowerCase());
}

function toggleOpzionale(itemId) {
  const item = itemsNelPercorso.find((i) => i.itemId === itemId);
  if (item) {
    item.opzionale = !item.opzionale;
    renderPercorso();
  }
}

function ricalcolaOrdini() {
  itemsNelPercorso.forEach((item, i) => (item.ordine = i + 1));
}

function renderPercorso() {
  const list = document.getElementById("dndList");
  document.getElementById("countItems").textContent =
    `${itemsNelPercorso.length} item`;

  // Calcola durata totale
  const durataMin = itemsNelPercorso.reduce(
    (acc, i) => acc + lunghezzaInMinuti(i.lunghezza),
    0,
  );
  document.getElementById("durataCalcolata").textContent =
    `Durata: ~${Math.round(durataMin)} min`;

  if (!itemsNelPercorso.length) {
    list.innerHTML = `<div class="aa-empty" style="padding:1.5rem"><div class="aa-empty-icon" style="font-size:2rem">📭</div><p class="mb-0" style="font-size:0.85rem">Aggiungi item dal catalogo sottostante</p></div>`;
    return;
  }

  list.innerHTML = itemsNelPercorso
    .map(
      (item) => `
    <div class="aa-dnd-item ${item.opzionale ? "optional-item" : ""}"
         draggable="true"
         data-id="${item.itemId}"
         ondragstart="onDragStart(event)"
         ondragover="onDragOver(event)"
         ondrop="onDrop(event)"
         ondragend="onDragEnd(event)">
      <span class="drag-handle">⠿</span>
      <span class="item-num">${item.ordine}</span>
      <div class="item-info">
        <div class="item-title">${item.titolo}</div>
        <div class="item-meta">
          ${badgeLinguaggio(item.linguaggio)}
          ${badgeLunghezza(item.lunghezza)}
          ${item.opzionale ? '<span class="aa-badge aa-badge-len" style="border-style:dashed">opzionale</span>' : ""}
        </div>
      </div>
      <div class="d-flex gap-1 ms-auto">
        <button class="btn-aa-outline" style="font-size:0.72rem;padding:2px 8px" 
                onclick="toggleOpzionale('${item.itemId}')"
                title="${item.opzionale ? "Rendi obbligatorio" : "Rendi opzionale"}">
          ${item.opzionale ? "⟳" : "○"}
        </button>
        <button class="btn-aa-danger" onclick="rimuoviItemDalPercorso('${item.itemId}')">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

// ─── DRAG & DROP ─────────────────────────────────────
function onDragStart(e) {
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

  // Sposta elemento
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

// ─── SALVA VISITA ─────────────────────────────────────
async function salvaVisita() {
  const titolo = document.getElementById("visitaTitolo").value.trim();
  const museo = document.getElementById("visitaMuseo").value;
  const autoreId = document.getElementById("visitaAutore").value;
  const desc = document.getElementById("visitaDescrizione").value.trim();
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

  if (!titolo || !museo || !autoreId)
    return showToast(
      "Compila i campi obbligatori (Titolo, Museo, Autore)",
      "error",
    );
  if (!itemsNelPercorso.length)
    return showToast("Aggiungi almeno un item al percorso", "error");

  const payload = {
    titolo,
    museo,
    descrizione: desc,
    tags,
    durataTotaleStimata: durata,
    licenza: { tipo: licenza },
    prezzo,
    pubblica,
    creatorId: autoreId,
    items: itemsNelPercorso.map((i) => ({
      itemId: i.itemId,
      ordine: i.ordine,
      opzionale: i.opzionale,
    })),
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `/api/visite/${id}` : "/api/visite";

  const ok = await apiFetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (ok) {
    showToast(id ? "Visita aggiornata!" : "Visita creata!", "success");
    resetEditor();
    await caricaVisiteList();
  }
}

// ─── CARICA VISITA PER MODIFICA ──────────────────────
async function caricaVisitaPerModifica(id) {
  const v = await apiFetch(`/api/visite/${id}`);
  if (!v) return;

  document.getElementById("visitaId").value = v._id;
  document.getElementById("visitaTitolo").value = v.titolo;
  document.getElementById("visitaMuseo").value = v.museo;
  document.getElementById("visitaDescrizione").value = v.descrizione || "";
  document.getElementById("visitaTags").value = (v.tags || []).join(", ");
  document.getElementById("visitaDurata").value = v.durataTotaleStimata || 60;
  document.getElementById("visitaLicenza").value =
    v.licenza?.tipo || "gratuito";
  document.getElementById("visitaPrezzo").value = v.prezzo || 0;
  document.getElementById("visitaPubblica").checked = v.pubblica;
  document.getElementById("visitaAutore").value = v.creatorId?._id || "";
  document.getElementById("editorTitolo").textContent = `Modifica: ${v.titolo}`;

  itemsNelPercorso = (v.items || []).map((i) => ({
    itemId: i.itemId?._id || i.itemId,
    ordine: i.ordine,
    opzionale: i.opzionale,
    titolo: i.itemId?.titolo || "–",
    lunghezza: i.itemId?.lunghezza || "1m",
    linguaggio: i.itemId?.linguaggio || "intermedio",
    categoria: i.itemId?.categoria || "altro",
  }));

  renderPercorso();
  showToast(`Visita "${v.titolo}" caricata per modifica`, "info");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminaVisita(id) {
  if (!confirm("Eliminare questa visita?")) return;
  const ok = await apiFetch(`/api/visite/${id}`, { method: "DELETE" });
  if (ok !== null) {
    showToast("Visita eliminata", "success");
    resetEditor();
    caricaVisiteList();
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
  itemsNelPercorso = [];
  renderPercorso();
  renderCatalogo("");
}
