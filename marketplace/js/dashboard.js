/* ═══════════════════════════════════════════════════
   dashboard.js – Logica Dashboard ArtAround
   ═══════════════════════════════════════════════════ */

// ─── STATO GLOBALE ───────────────────────────────────
const stato = {
  tabCorrente: "items",
  filtri: {
    museo: "",
    linguaggio: "",
    categoria: "",
    prezzo: "",
    cerca: "",
  },
  paginaItems: 1,
  paginaVisite: 1,
  limite: 12,
};

// ─── INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Leggi parametri URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("museo")) stato.filtri.museo = params.get("museo");

  await caricaMuseiFiltro();
  await caricaItems();
  caricaVisiteTab();

  // Attiva sidebar log per autori
  const u = getUtenteCorrente();
  if (u && ["autore", "admin"].includes(u.ruolo)) {
    document.getElementById("sidebarLog")?.classList.remove("d-none");
  }

  // Filtri sidebar – click handler
  configuraBtnFiltri("[data-museo]", (v) => {
    stato.filtri.museo = v;
    stato.paginaItems = 1;
    caricaItems();
  });
  configuraBtnFiltri("[data-lang]", (v) => {
    stato.filtri.linguaggio = v;
    stato.paginaItems = 1;
    caricaItems();
  });
  configuraBtnFiltri("[data-cat]", (v) => {
    stato.filtri.categoria = v;
    stato.paginaItems = 1;
    caricaItems();
  });
  configuraBtnFiltri("[data-prezzo]", (v) => {
    stato.filtri.prezzo = v;
    stato.paginaItems = 1;
    caricaItems();
  });

  // Ricerca testuale con debounce
  document.getElementById("campoCerca")?.addEventListener(
    "input",
    debounce((e) => {
      stato.filtri.cerca = e.target.value.trim();
      stato.paginaItems = 1;
      caricaItems();
    }, 350),
  );

  // Cambio limite
  document.getElementById("selectLimit")?.addEventListener("change", (e) => {
    stato.limite = Number(e.target.value);
    stato.paginaItems = 1;
    caricaItems();
  });

  // Seleziona filtro museo se arrivato dalla home
  if (stato.filtri.museo) {
    setTimeout(() => {
      const btn = document.querySelector(
        `[data-museo="${stato.filtri.museo}"]`,
      );
      if (btn) {
        document
          .querySelectorAll("[data-museo]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    }, 500);
  }
});

function configuraBtnFiltri(selector, callback) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      btn
        .closest("div")
        .querySelectorAll(".aa-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      callback(
        btn.dataset.museo ??
          btn.dataset.lang ??
          btn.dataset.cat ??
          btn.dataset.prezzo ??
          "",
      );
    });
  });
}

// ─── TABS ────────────────────────────────────────────
function switchTab(tab, btnEl) {
  stato.tabCorrente = tab;
  document
    .querySelectorAll(".aa-tab")
    .forEach((b) => b.classList.remove("active"));
  btnEl.classList.add("active");

  document
    .getElementById("tabItems")
    .classList.toggle("d-none", tab !== "items");
  document
    .getElementById("tabVisite")
    .classList.toggle("d-none", tab !== "visite");
  document.getElementById("tabMiei").classList.toggle("d-none", tab !== "miei");

  if (tab === "visite") caricaVisiteTab();
  if (tab === "miei") caricaMieiContenuti();
}

// ─── CARICA MUSEI (FILTRO) ───────────────────────────
async function caricaMuseiFiltro() {
  const musei = await apiFetch("/api/musei");
  if (!musei) return;
  const container = document.getElementById("filtroMusei");
  musei.forEach((m) => {
    const btn = document.createElement("button");
    btn.className = "aa-filter-btn";
    btn.dataset.museo = m;
    btn.textContent = m.length > 22 ? m.substring(0, 20) + "…" : m;
    btn.title = m;
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".aa-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stato.filtri.museo = m;
      stato.paginaItems = 1;
      caricaItems();
    });
    container.appendChild(btn);
  });
}

// ─── CARICA ITEMS ────────────────────────────────────
async function caricaItems(pagina = stato.paginaItems) {
  stato.paginaItems = pagina;
  const grid = document.getElementById("itemsGrid");
  grid.innerHTML =
    '<div class="col-12 text-center py-5"><div class="aa-spinner"></div> Caricamento...</div>';

  const qs = new URLSearchParams({
    pagina,
    limite: stato.limite,
    ...(stato.filtri.museo && { museo: stato.filtri.museo }),
    ...(stato.filtri.linguaggio && { linguaggio: stato.filtri.linguaggio }),
    ...(stato.filtri.categoria && { categoria: stato.filtri.categoria }),
    ...(stato.filtri.cerca && { cerca: stato.filtri.cerca }),
    ...(stato.filtri.prezzo === "free" && { maxPrezzo: 0 }),
    ...(stato.filtri.prezzo === "paid" && { minPrezzo: 0.01 }),
  });

  const data = await apiFetch(`/api/items?${qs}`);
  if (!data) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">❌</div><p>Errore nel caricamento.</p></div></div>';
    return;
  }

  if (!data.items.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🔍</div><h5>Nessun risultato</h5><p>Prova a modificare i filtri di ricerca.</p></div></div>';
    renderPaginazione("paginazioneItems", pagina, 0, "caricaItems");
    return;
  }

  grid.innerHTML = data.items.map((item) => renderItemCard(item)).join("");
  renderPaginazione("paginazioneItems", pagina, data.pagine, "caricaItems");
}

function renderItemCard(item) {
  const img = item.immagine
    ? `<img src="${item.immagine}" class="card-img-top" alt="${item.titolo}" onerror="this.style.display='none'">`
    : `<div class="aa-item-placeholder">${iconaCategoria(item.categoria)}</div>`;

  return `
    <div class="col-sm-6 col-md-4 col-xl-3">
      <div class="aa-item-card" style="cursor:pointer" onclick="apriItemModal('${item._id}')">
        ${img}
        <div class="card-body">
          <div class="card-title">${item.titolo}</div>
          <div class="d-flex gap-1 flex-wrap mb-2">
            ${badgeLinguaggio(item.linguaggio)}
            ${badgeLunghezza(item.lunghezza)}
          </div>
          <p class="card-text">${item.descrizione}</p>
        </div>
        <div class="card-footer">
          ${badgePrezzo(item.prezzo)}
          <span class="text-slate" style="font-size:0.72rem">${item.licenza?.tipo || "–"}</span>
        </div>
      </div>
    </div>
  `;
}

function iconaCategoria(cat) {
  const mappa = {
    pittura: "🖼️",
    scultura: "🗿",
    architettura: "🏛️",
    fotografia: "📷",
    arte_moderna: "🎨",
    arte_antica: "🏺",
    decorativa: "🪆",
    altro: "🔍",
  };
  return mappa[cat] || "🔍";
}

// ─── MODAL ITEM DETTAGLIO ────────────────────────────
async function apriItemModal(id) {
  const modal = document.getElementById("itemModal");
  modal.classList.remove("d-none");
  document.getElementById("modalItemTitolo").textContent = "Caricamento…";
  document.getElementById("modalItemBody").innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';
  document.getElementById("modalItemFooter").innerHTML = "";

  const item = await apiFetch(`/api/items/${id}`);
  if (!item) {
    modal.classList.add("d-none");
    return;
  }

  document.getElementById("modalItemTitolo").textContent = item.titolo;

  document.getElementById("modalItemBody").innerHTML = `
    ${item.immagine ? `<img src="${item.immagine}" class="w-100 mb-3" style="border-radius:8px;max-height:220px;object-fit:cover" alt="">` : ""}
    <div class="d-flex flex-wrap gap-2 mb-3">
      ${badgeLinguaggio(item.linguaggio)}
      ${badgeLunghezza(item.lunghezza)}
      <span class="aa-badge aa-badge-len">${item.categoria}</span>
      <span class="aa-badge aa-badge-len">Profondità: ${item.profonditaContenuto}</span>
    </div>
    <p style="line-height:1.7">${item.descrizione}</p>
    <div class="divider"></div>
    <div class="row g-2 text-sm">
      <div class="col-6"><span class="aa-label">Opera ID</span><div>${item.operaId}</div></div>
      <div class="col-6"><span class="aa-label">Museo</span><div>${item.museo}</div></div>
      <div class="col-6"><span class="aa-label">Autore</span><div>${item.creatorId?.username || "–"}</div></div>
      <div class="col-6"><span class="aa-label">Licenza</span><div>${item.licenza?.tipo || "–"}</div></div>
    </div>
    ${item.tags?.length ? `<div class="mt-3">${item.tags.map((t) => `<span class="aa-badge aa-badge-len me-1">${t}</span>`).join("")}</div>` : ""}
    ${item.logVendite?.length > 0 ? `<div class="mt-3 text-slate small">${item.logVendite.length} vendita/e registrata/e</div>` : ""}
  `;

  const u = getUtenteCorrente();
  let footerHtml = `<button class="btn-aa-outline" onclick="chiudiItemModal()">Chiudi</button>`;

  if (item.prezzo > 0 && u) {
    footerHtml += `<button class="btn-aa-gold" onclick="acquistaItem('${item._id}')">
      <i class="bi bi-bag-check"></i> Acquista €${Number(item.prezzo).toFixed(2)}
    </button>`;
  }

  if (u && u._id === item.creatorId?._id) {
    footerHtml += `<a href="/editor-item?id=${item._id}" class="btn-aa-outline">
      <i class="bi bi-pencil"></i> Modifica
    </a>`;
  }

  document.getElementById("modalItemFooter").innerHTML = footerHtml;
}

function chiudiItemModal() {
  document.getElementById("itemModal").classList.add("d-none");
}

async function acquistaItem(itemId) {
  const u = getUtenteCorrente();
  if (!u) return showToast("Accedi per acquistare", "error");
  const ok = await apiFetch(`/api/items/${itemId}/acquista`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acquirenteId: u._id }),
  });
  if (ok) {
    showToast("Acquisto completato!", "success");
    chiudiItemModal();
  }
}

// ─── TAB VISITE ──────────────────────────────────────
async function caricaVisiteTab(pagina = stato.paginaVisite) {
  stato.paginaVisite = pagina;
  const grid = document.getElementById("visiteGrid");
  grid.innerHTML =
    '<div class="col-12 text-center py-5"><div class="aa-spinner"></div></div>';

  const qs = new URLSearchParams({
    pagina,
    limite: stato.limite,
    ...(stato.filtri.museo && { museo: stato.filtri.museo }),
  });

  const data = await apiFetch(`/api/visite?${qs}`);
  if (!data || !data.visite.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🗺️</div><h5>Nessuna visita disponibile</h5><p>Crea la prima visita dall\'Editor.</p><a href="/editor-visita" class="btn-aa-primary mt-2">Crea Visita</a></div></div>';
    return;
  }

  grid.innerHTML = data.visite.map((v) => renderVisitaCard(v)).join("");
  renderPaginazione(
    "paginazioneVisite",
    pagina,
    data.pagine,
    "caricaVisiteTab",
  );
}

function renderVisitaCard(v) {
  const itemsObbligatori = v.items?.filter((i) => !i.opzionale).length || 0;
  const itemsOpzionali = v.items?.filter((i) => i.opzionale).length || 0;

  return `
    <div class="col-md-6 col-xl-4">
      <div class="aa-visita-card">
        <div class="vcard-header">
          <h5>${v.titolo}</h5>
          <small style="opacity:0.65">${v.museo}</small>
        </div>
        <div class="vcard-body">
          <p class="small text-slate mb-3" style="line-height:1.5">${v.descrizione || "Nessuna descrizione."}</p>
          <div class="d-flex gap-3 mb-3 text-slate" style="font-size:0.8rem">
            <span><i class="bi bi-list-ol"></i> ${itemsObbligatori} obbligatori</span>
            <span><i class="bi bi-dash-circle"></i> ${itemsOpzionali} opzionali</span>
            <span><i class="bi bi-clock"></i> ~${v.durataTotaleStimata} min</span>
          </div>
          ${v.tags?.length ? `<div class="mb-3">${v.tags.map((t) => `<span class="aa-badge aa-badge-len">${t}</span>`).join("")}</div>` : ""}
          <div class="d-flex justify-content-between align-items-center">
            ${badgePrezzo(v.prezzo)}
            <div class="d-flex gap-1">
              <button class="btn-aa-outline" style="font-size:0.78rem;padding:0.3rem 0.7rem" onclick="adottaVisita('${v._id}')">
                <i class="bi bi-bookmark-plus"></i> Adotta
              </button>
              <a href="/editor-visita?id=${v._id}" class="btn-aa-outline" style="font-size:0.78rem;padding:0.3rem 0.7rem">
                <i class="bi bi-pencil"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function adottaVisita(visitaId) {
  const u = getUtenteCorrente();
  if (!u) return showToast("Accedi per adottare una visita", "error");
  const ok = await apiFetch(`/api/visite/${visitaId}/adotta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adottanteId: u._id }),
  });
  if (ok) showToast("Visita adottata e salvata nel tuo profilo!", "success");
}

// ─── MIEI CONTENUTI ──────────────────────────────────
async function caricaMieiContenuti() {
  const u = getUtenteCorrente();
  const container = document.getElementById("mieiContenuti");

  if (!u) {
    container.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">🔐</div><h5>Accesso richiesto</h5><p>Effettua il login per vedere i tuoi contenuti.</p><a href="/" class="btn-aa-primary">Vai al login</a></div>`;
    return;
  }

  container.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  if (["autore", "admin"].includes(u.ruolo)) {
    // Carica items creati dall'autore
    const data = await apiFetch(`/api/items?pubblicato=tutti&limite=50`);
    if (!data) return;
    const miei = data.items.filter(
      (i) => i.creatorId?._id === u._id || i.creatorId === u._id,
    );

    if (!miei.length) {
      container.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">✏️</div><h5>Nessun contenuto ancora</h5><p>Inizia creando il tuo primo Item.</p><a href="/editor-item" class="btn-aa-primary">Crea Item</a></div>`;
      return;
    }

    container.innerHTML = `
      <div class="aa-card mb-3">
        <div class="aa-card-header"><i class="bi bi-collection"></i> I miei Item (${miei.length})</div>
        <div class="aa-card-body p-0">
          <table class="aa-table">
            <thead>
              <tr><th>Titolo</th><th>Museo</th><th>Linguaggio</th><th>Prezzo</th><th>Stato</th><th>Azioni</th></tr>
            </thead>
            <tbody>
              ${miei
                .map(
                  (item) => `
                <tr>
                  <td><strong>${item.titolo}</strong><br><small class="text-slate">${item.operaId}</small></td>
                  <td><small>${item.museo}</small></td>
                  <td>${badgeLinguaggio(item.linguaggio)}</td>
                  <td>${badgePrezzo(item.prezzo)}</td>
                  <td><span class="aa-badge ${item.pubblicato ? "aa-badge-free" : "aa-badge-len"}">${item.pubblicato ? "Pubblicato" : "Bozza"}</span></td>
                  <td>
                    <a href="/editor-item?id=${item._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a>
                    <button class="btn-aa-danger ms-1" onclick="eliminaItem('${item._id}')">✕</button>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `<div class="aa-empty"><div class="aa-empty-icon">👤</div><h5>Visitatore</h5><p>Esplora il catalogo e adotta le visite che ti interessano.</p><button class="btn-aa-primary" onclick="switchTab('visite', document.getElementById('tabVisiteBtn'))">Vedi Visite</button></div>`;
  }
}

async function eliminaItem(itemId) {
  if (!confirm("Eliminare questo item?")) return;
  const ok = await apiFetch(`/api/items/${itemId}`, { method: "DELETE" });
  if (ok !== null) {
    showToast("Item eliminato", "success");
    caricaMieiContenuti();
  }
}

// ─── LOG VENDITE ─────────────────────────────────────
async function apriLogModal() {
  document.getElementById("logModal").classList.remove("d-none");
  const body = document.getElementById("logBody");
  body.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const items = await apiFetch("/api/log/vendite");
  if (!items || !items.length) {
    body.innerHTML =
      '<div class="aa-empty"><div class="aa-empty-icon">📋</div><p>Nessuna vendita registrata.</p></div>';
    return;
  }

  let rows = "";
  items.forEach((item) => {
    item.logVendite.forEach((log) => {
      rows += `
        <tr>
          <td><strong>${item.titolo}</strong></td>
          <td><small>${item.operaId}</small></td>
          <td>${log.acquirenteId?.username || "–"}</td>
          <td><span class="aa-badge ${log.tipo === "acquisto" ? "aa-badge-paid" : "aa-badge-free"}">${log.tipo}</span></td>
          <td>€ ${Number(log.prezzo || 0).toFixed(2)}</td>
          <td><small>${new Date(log.dataAcquisto).toLocaleDateString("it-IT")}</small></td>
        </tr>
      `;
    });
  });

  body.innerHTML = `
    <div style="overflow-x:auto">
      <table class="aa-table">
        <thead><tr><th>Item</th><th>Opera ID</th><th>Acquirente</th><th>Tipo</th><th>Importo</th><th>Data</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ─── RESET FILTRI ────────────────────────────────────
function resetFiltri() {
  stato.filtri = {
    museo: "",
    linguaggio: "",
    categoria: "",
    prezzo: "",
    cerca: "",
  };
  stato.paginaItems = 1;
  document.getElementById("campoCerca").value = "";
  document.querySelectorAll(".aa-filter-btn").forEach((btn, _, arr) => {
    // Riattiva solo il primo bottone di ogni gruppo
    const gruppo = btn.parentElement;
    const primo = gruppo.querySelector(".aa-filter-btn");
    btn.classList.toggle("active", btn === primo);
  });
  caricaItems();
}
