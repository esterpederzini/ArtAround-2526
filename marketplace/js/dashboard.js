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
  // Carica configurazione museo
  const config = await caricaConfigMuseo();
  if (!config) {
    showToast("Configurazione museo non trovata", "error");
    return;
  }

  // Leggi parametri URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("museo")) stato.filtri.museo = params.get("museo");

  await caricaMuseiFiltro();
  await caricaItems();
  caricaVisiteTab();

  aggiornaUtenteUI();
  // Attiva sidebar log e permessi di creazione
  const u = getUtenteCorrente();

  if (u) {
    document.getElementById("tabMieiBtn")?.classList.remove("d-none");

    if (["autore", "admin"].includes(u.ruolo)) {
      document.getElementById("sidebarLog")?.classList.remove("d-none");

      // Mostra il gruppo bottoni autore
      document.getElementById("authorActions")?.classList.remove("d-none");

      // Sincronizza i bottoni di creazione basandoti sulla tab iniziale ("items")
      document.getElementById("btnNuovoItem")?.classList.remove("d-none");
      document.getElementById("btnNuovaVisita")?.classList.add("d-none");
    }
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

  // Gestione pulita dei bottoni d'azione (Solo per Autori e Admin)
  const btnNuovoItem = document.getElementById("btnNuovoItem");
  const btnNuovaVisita = document.getElementById("btnNuovaVisita");
  const u = getUtenteCorrente();

  if (btnNuovoItem && btnNuovaVisita) {
    if (u && ["autore", "admin"].includes(u.ruolo)) {
      if (tab === "items") {
        btnNuovoItem.classList.remove("d-none");
        btnNuovaVisita.classList.add("d-none");
      } else if (tab === "visite") {
        btnNuovoItem.classList.add("d-none");
        btnNuovaVisita.classList.remove("d-none");
      } else {
        btnNuovoItem.classList.add("d-none");
        btnNuovaVisita.classList.add("d-none");
      }
    } else {
      btnNuovoItem.classList.add("d-none");
      btnNuovaVisita.classList.add("d-none");
    }
  }

  if (tab === "visite") caricaVisiteTab();
  if (tab === "miei") caricaMieiContenuti();
}

// ─── CARICA MUSEI (FILTRO) ───────────────────────────
async function caricaMuseiFiltro() {
  const config = await caricaConfigMuseo();
  if (!config) return;

  const container = document.getElementById("filtroMusei");
  if (!container) return;

  // Svuota il contenuto esistente
  container.innerHTML = "";

  // Aggiungi un bottone per il museo corrente dalla configurazione
  const btn = document.createElement("button");
  btn.className = "aa-filter-btn active";
  btn.dataset.museo = config.museo;
  btn.textContent =
    config.museo.length > 22
      ? config.museo.substring(0, 20) + "…"
      : config.museo;
  btn.title = config.museo;
  btn.addEventListener("click", () => {
    container
      .querySelectorAll(".aa-filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    stato.filtri.museo = config.museo;
    stato.paginaItems = 1;
    caricaItems();
  });
  container.appendChild(btn);
}

// ─── CARICA CONFIGURAZIONE MUSEO ─────────────────────
async function caricaConfigMuseo() {
  try {
    // Chiediamo i dati al server tramite la rotta API
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Configurazione non trovata sul server");
    }

    // Il server ci risponde inviando il file JSON, lo convertiamo in oggetto JS
    const config = await response.json();
    return config;
  } catch (error) {
    console.error("Errore nel caricamento della configurazione:", error);
    return null;
  }
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
  const img = item.url
    ? `<img src="${item.url}" class="card-img-top" alt="${item.titolo}" onerror="this.style.display='none'">`
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

async function apriItemModal(id) {
  const modal = document.getElementById("itemModal");
  modal.classList.remove("d-none");
  document.getElementById("modalItemTitolo").textContent = "Caricamento…";

  // Spinner di caricamento coerente con lo stile
  document.getElementById("modalItemBody").innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';
  document.getElementById("modalItemFooter").innerHTML = "";
  document.getElementById("modalItemFooter").classList.remove("d-none"); // Assicuriamoci che sia visibile

  const item = await apiFetch(`/api/items/${id}`);
  if (!item) {
    modal.classList.add("d-none");
    return;
  }

  document.getElementById("modalItemTitolo").textContent = item.titolo;

  // 🛡️ Gestione Fallback Immagine (se manca, usa il placeholder di style.css)
  const mediaHTML = item.url
    ? `<img src="${item.url}" class="img-fluid rounded border border-soft w-100" style="max-height: 250px; object-fit: cover;" alt="">`
    : `<div class="aa-item-placeholder rounded border border-soft d-flex align-items-center justify-content-center" style="height: 180px;">
         <i class="bi bi-image" style="font-size: 2.5rem; color: var(--aa-tortora);"></i>
       </div>`;

  // Integrazione dei tuoi metadati nella griglia a due colonne
  document.getElementById("modalItemBody").innerHTML = `
    <div class="row g-3">
      <div class="col-md-5">
        ${mediaHTML}
      </div>

      <div class="col-md-7 d-flex flex-column justify-content-between">
        <div>
          <div class="text-uppercase text-slate small fw-bold tracking-wider mb-2" style="letter-spacing: 0.05em;">
            Classificazione Item
          </div>
          <div class="d-flex flex-wrap gap-1 mb-3">
            ${badgeLinguaggio(item.linguaggio)}
            ${badgeLunghezza(item.lunghezza)}
            <span class="badge aa-badge aa-badge-len">${item.categoria}</span>
            <span class="badge aa-badge aa-badge-len">Prof.: ${item.profonditaContenuto}</span>
          </div>
        </div>

        <div class="p-2 rounded bg-cream border border-soft shadow-sm" style="font-size: 0.85rem;">
          <div class="row g-2">
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Opera ID</span><div class="fw-semibold text-charcoal">${item.operaId || "–"}</div></div>
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Museo</span><div class="fw-semibold text-charcoal">${item.museo || "–"}</div></div>
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Autore</span><div class="text-taupe fw-semibold">${item.creatorId?.username || "–"}</div></div>
            <div class="col-6"><span class="aa-label m-0" style="font-size:0.7rem;">Licenza</span><div class="text-slate fw-semibold">${item.licenza?.tipo || item.licenza || "–"}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="mb-2">
      <div class="aa-sidebar-title" style="font-size: 0.75rem; border-bottom: none; margin-bottom: 0.5rem; padding-bottom: 0;">
        Contenuto Testuale (Sintesi Vocale)
      </div>
      <p class="text-charcoal px-3 py-3 rounded bg-cream border-soft" style="font-size: 0.95rem; line-height: 1.6; border-left: 3px solid var(--aa-taupe); margin: 0;">
        ${item.descrizione || "Nessuna descrizione inserita."}
      </p>
    </div>

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 pt-2 border-top border-soft">
      <div>
        ${item.tags?.length ? item.tags.map((t) => `<span class="badge aa-badge aa-badge-len me-1">${t}</span>`).join("") : "–"}
      </div>
      <div>
        ${item.logVendite?.length > 0 ? `<span class="text-slate small"><i class="bi bi-graph-up"></i> ${item.logVendite.length} vendite</span>` : ""}
      </div>
    </div>
  `;

  // --- LOGICA FOOTER DINAMICA CON CONTROLLI DI PROPRIETÀ E ACQUISTO PRECEDENTE ---
  let footerHtml = ``;
  const u = getUtenteCorrente();

  // Verifichiamo se l'utente corrente è il creatore dell'item
  const idCreatoreItem = item.creatorId?._id || item.creatorId;
  const isProprietarioItem = u && idCreatoreItem === u._id;

  // Verifichiamo se l'utente corrente ha già acquistato o adottato questo item in passato
  const giaAcquistatoItem =
    u &&
    Array.isArray(item.logVendite) &&
    item.logVendite.some((log) => {
      const idAcquirente = log.acquirenteId?._id || log.acquirenteId;
      return idAcquirente === u._id;
    });

  // Se l'utente è il proprietario o lo ha già acquistato, mostriamo un badge informativo invece dei pulsanti
  if (isProprietarioItem) {
    footerHtml = ``;
  } else if (giaAcquistatoItem) {
    footerHtml = `
      <span class="text-success small me-auto align-self-center fw-semibold">
        <i class="bi bi-check-circle-fill"></i> Acquistato
      </span>
    `;
  } else {
    // Se non è proprietario e non l'ha mai comprato, mostriamo i pulsanti d'azione standard
    const titoloItemEscaped = (item.titolo || "Item")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");
    const prezzoItem = item.prezzo ? Number(item.prezzo) : 0;

    if (prezzoItem > 0) {
      footerHtml += `
        <button class="btn-aa-gold" id="btnAcquistaItem" onclick="eseguiAcquistoDnAdozioneItem('${item._id}', '${titoloItemEscaped}', ${prezzoItem})">
          <i class="bi bi-bag-check"></i> Acquista €${prezzoItem.toFixed(2)}
        </button>
      `;
    } else {
      footerHtml += `
        <button class="btn-aa-primary" id="btnAdottaItem" onclick="eseguiAcquistoDnAdozioneItem('${item._id}', '${titoloItemEscaped}', 0)">
          Acquista Gratis
        </button>
      `;
    }
  }

  document.getElementById("modalItemFooter").innerHTML = footerHtml;
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

function chiudiItemModal() {
  document.getElementById("itemModal").classList.add("d-none");
}

async function apriVisitaModal(id) {
  const modal = document.getElementById("visitaModal");
  modal.classList.remove("d-none");
  document.getElementById("modalVisitaTitolo").textContent = "Caricamento…";
  document.getElementById("modalVisitaBody").innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';
  document.getElementById("modalVisitaFooter").innerHTML = "";

  // Scarica i dettagli completi della visita dal server
  const v = await apiFetch(`/api/visite/${id}`);
  if (!v) {
    modal.classList.add("d-none");
    return;
  }

  document.getElementById("modalVisitaTitolo").textContent =
    v.titolo || v.title || "Visita";

  // 🛠️ FIX LICENZA: Estrae la licenza dal primo item valido del percorso se manca nella visita
  const primaTappaConLicenza = v.tappe?.find(
    (t) =>
      t.item_default &&
      (t.item_default.licenza?.tipo || t.item_default.licenza),
  );
  const licenzaReale =
    v.licenza?.tipo ||
    v.licenza ||
    primaTappaConLicenza?.item_default?.licenza?.tipo ||
    primaTappaConLicenza?.item_default?.licenza ||
    "–";

  // 🛠️ FIX TAGS: Se la visita non ha tag propri, fa il merge dei tag dei singoli item delle tappe
  let tagSet = new Set();
  if (Array.isArray(v.tags)) {
    v.tags.forEach((t) => tagSet.add(t));
  } else if (v.tappe) {
    v.tappe.forEach((t) => {
      if (Array.isArray(t.item_default?.tags)) {
        t.item_default.tags.forEach((tag) => tagSet.add(tag));
      }
    });
  }
  const arrayTags = Array.from(tagSet);

  // Costruisce la lista delle tappe del percorso
  let tappeHtml =
    '<em class="text-slate small">Nessuna tappa inserita nel percorso.</em>';
  if (v.tappe && v.tappe.length > 0) {
    tappeHtml = v.tappe
      .map((t) => {
        const infoItem = t.item_default || {};
        const nomeTappa = infoItem.titolo || "Tappa inesistente";
        const idOpera = t.operaId || infoItem.operaId || "–";
        return `<div class="d-flex align-items-center gap-2 mb-2 p-2 rounded" style="background:var(--aa-cream)">
                <span class="aa-badge aa-badge-len" style="background:white">${t.ordine}</span>
                <div class="flex-grow-1" style="font-size:0.85rem">
                  <strong>${nomeTappa}</strong> <span class="text-slate mx-1">·</span> <small>${idOpera}</small>
                </div>
                ${t.opzionale ? '<span style="font-size:0.7rem; color:var(--aa-slate)">Opzionale</span>' : ""}
              </div>`;
      })
      .join("");
  }

  // Costruisce il corpo del Modal mappando "v.duration" e "licenzaReale"
  document.getElementById("modalVisitaBody").innerHTML = `
    <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <span class="aa-badge aa-badge-len">🏛️ ${v.museo || "Nessun museo"}</span>
      <span class="aa-badge aa-badge-len"><i class="bi bi-clock"></i> ${v.duration || v.durataTotaleStimata || "60 min"}</span>
      ${badgeLinguaggio(v.livello_base)}
      ${badgePrezzo(v.prezzo)}
    </div>
    <p style="line-height:1.7">${v.descrizione || "Nessuna descrizione disponibile."}</p>
    <div class="divider"></div>
    <div class="row g-2 text-sm mb-3">
      <div class="col-6"><span class="aa-label">Autore</span><div>${v.creatorId?.username || v.autore || "–"}</div></div>
      <div class="col-6"><span class="aa-label">Licenza</span><div>${v.licenza?.tipo || "–"}</div></div>
    </div>
    ${arrayTags.length ? `<div class="mb-3">${arrayTags.map((t) => `<span class="aa-badge aa-badge-len me-1">${t}</span>`).join("")}</div>` : ""}
    
    <div class="aa-sidebar-title mt-4" style="font-size: 0.72rem"><i class="bi bi-geo-alt"></i> Percorso della visita</div>
    <div class="pe-2">
        ${tappeHtml}
    </div>
  `;

  // --- LOGICA FOOTER DINAMICA CON CONTROLLI DI PROPRIETÀ E ADOZIONE PRECEDENTE ---
  let footerHtml = ``;
  const u = getUtenteCorrente();

  const idCreatoreVisita = v.creatorId?._id || v.creatorId;
  const isProprietarioVisita = u && idCreatoreVisita === u._id;

  const giaAdottataVisita =
    u &&
    Array.isArray(v.logAdozioni) &&
    v.logAdozioni.some((log) => {
      const idAdottante = log.adottanteId?._id || log.adottanteId;
      return idAdottante === u._id;
    });

  if (isProprietarioVisita) {
    footerHtml = ``;
  } else if (giaAdottataVisita) {
    footerHtml = `
      <span class="text-success small me-auto align-self-center fw-semibold">
        <i class="bi bi-check-circle-fill"></i> Visita acquistata
      </span>
    `;
  } else {
    const titoloVisitaEscaped = (v.titolo || v.title || "Visita")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");
    const prezzoVisita = v.prezzo ? Number(v.prezzo) : 0;

    if (prezzoVisita > 0) {
      footerHtml += `
        <button class="btn-aa-gold" id="btnAcquistaVisita" onclick="eseguiAcquistoDnAdozioneVisita('${v._id}', '${titoloVisitaEscaped}', ${prezzoVisita})">
          <i class="bi bi-bag-check"></i> Acquista €${prezzoVisita.toFixed(2)}
        </button>
      `;
    } else {
      footerHtml += `
        <button class="btn-aa-primary" id="btnAdottaVisita" onclick="eseguiAcquistoDnAdozioneVisita('${v._id}', '${titoloVisitaEscaped}', 0)">
          Acquista Gratis
        </button>
      `;
    }
  }

  const footerElement = document.getElementById("modalVisitaFooter");
  footerElement.innerHTML = footerHtml;
  footerElement.classList.remove("d-none");
}

function chiudiVisitaModal() {
  document.getElementById("visitaModal").classList.add("d-none");
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

  // Filtra le visite in base al ruolo dell'utente:
  // - Visita pubblica (gratis o a pagamento): visibile a tutti
  // - Visita privata: visibile solo al suo creatore
  const u = getUtenteCorrente();
  const visiteFiltrate = data.visite.filter((v) => {
    if (v.pubblica !== false) return true; // pubblica: sempre visibile
    if (!u) return false; // privata + non loggato: nascosta
    const idCreatore = v.creatorId?._id || v.creatorId;
    return idCreatore === u._id; // privata: visibile solo all'autore
  });

  if (!visiteFiltrate.length) {
    grid.innerHTML =
      '<div class="col-12"><div class="aa-empty"><div class="aa-empty-icon">🗺️</div><h5>Nessuna visita disponibile</h5><p>Crea la prima visita dall\'Editor.</p><a href="/editor-visita" class="btn-aa-primary mt-2">Crea Visita</a></div></div>';
    return;
  }

  grid.innerHTML = visiteFiltrate.map((v) => renderVisitaCard(v)).join("");
  renderPaginazione(
    "paginazioneVisite",
    pagina,
    data.pagine,
    "caricaVisiteTab",
  );
}

function renderVisitaCard(v) {
  const itemsObbligatori =
    v.tappe?.filter((i) => !i.opzionale).length ||
    v.items?.filter((i) => !i.opzionale).length ||
    0;
  const itemsOpzionali =
    v.tappe?.filter((i) => i.opzionale).length ||
    v.items?.filter((i) => i.opzionale).length ||
    0;

  return `
    <div class="col-md-6 col-xl-4">
      <div class="aa-visita-card" style="cursor:pointer" onclick="apriVisitaModal('${v._id}')">
        <div class="vcard-header">
          <h5>${v.titolo || v.title || "Visita Senza Nome"}</h5>
          <small style="opacity:0.65">${v.museo || "Nessun museo"}</small>
        </div>
        <div class="vcard-body">
          <p class="small text-slate mb-3" style="line-height:1.5">${(v.descrizione || "Nessuna descrizione.").substring(0, 100)}...</p>
          <div class="d-flex gap-3 mb-3 text-slate" style="font-size:0.8rem">
            <span><i class="bi bi-list-ol"></i> ${itemsObbligatori} obb.</span>
            <span><i class="bi bi-dash-circle"></i> ${itemsOpzionali} opz.</span>
            <span><i class="bi bi-clock"></i> ~${v.durataTotaleStimata || 60} min</span>
          </div>
          ${v.tags?.length ? `<div class="mb-3">${v.tags.map((t) => `<span class="aa-badge aa-badge-len">${t}</span>`).join("")}</div>` : ""}
        </div>
        
        <div class="d-flex justify-content-between align-items-center mt-1 mb-2" style="padding-left: 12px;">
              ${badgePrezzo(v.prezzo)}
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

// ─── SALVATAGGIO REALE NEL DB: VISITE (CON BLOCCO AUTO-ACQUISTO) ───
async function eseguiAcquistoDnAdozioneVisita(visitaId, titolo, prezzo) {
  const u = getUtenteCorrente();
  if (!u) {
    showToast(
      `Accedi per poter ${prezzo > 0 ? "acquistare" : "adottare"} questa visita.`,
      "error",
    );
    apriLogin();
    return;
  }

  try {
    // 🛡️ CONTROLLO DI SICUREZZA LATO CLIENT
    // Richiediamo i dettagli della visita per verificare l'identità del creatore
    const visita = await apiFetch(`/api/visite/${visitaId}`);
    const idCreatore = visita?.creatorId?._id || visita?.creatorId;

    if (idCreatore && String(idCreatore) === String(u._id)) {
      showToast(
        "Operazione annullata: non puoi acquistare o adottare una visita creata da te.",
        "error",
      );
      chiudiVisitaModal();
      return;
    }

    const response = await apiFetch(`/api/visite/${visitaId}/adotta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adottanteId: u._id }),
    });

    if (response) {
      const messaggio =
        prezzo > 0
          ? `"${titolo}" acquistata correttamente e salvata nel tuo profilo!`
          : `"${titolo}" adottata correttamente e salvata nel tuo profilo!`;

      showToast(messaggio, "success");
      chiudiVisitaModal();

      if (typeof caricaVisiteTab === "function") caricaVisiteTab();
    }
  } catch (error) {
    console.error("Errore durante il salvataggio della visita:", error);
    showToast("Errore di rete durante il salvataggio nel database.", "error");
  }
}

// ─── SALVATAGGIO REALE NEL DB: ITEM (CON BLOCCO AUTO-ACQUISTO) ───
async function eseguiAcquistoDnAdozioneItem(itemId, titolo, prezzo) {
  const u = getUtenteCorrente();
  if (!u) {
    showToast(
      `Accedi per poter ${prezzo > 0 ? "acquistare" : "adottare"} questo contenuto.`,
      "error",
    );
    apriLogin();
    return;
  }

  try {
    // 🛡️ CONTROLLO DI SICUREZZA LATO CLIENT
    // Richiediamo i dettagli dell'item per verificare al volo l'identità del creatore
    const item = await apiFetch(`/api/items/${itemId}`);
    const idCreatore = item?.creatorId?._id || item?.creatorId;

    if (idCreatore && String(idCreatore) === String(u._id)) {
      showToast(
        "Operazione annullata: non puoi acquistare o adottare un contenuto creato da te.",
        "error",
      );
      chiudiItemModal();
      return;
    }

    const endpoint =
      prezzo > 0
        ? `/api/items/${itemId}/acquista`
        : `/api/items/${itemId}/adotta`;

    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utenteId: u._id }),
    });

    if (response) {
      const messaggio =
        prezzo > 0
          ? `"${titolo}" acquistato correttamente e salvato nel tuo profilo!`
          : `"${titolo}" adottato correttamente e salvato nel tuo profilo!`;

      showToast(messaggio, "success");
      chiudiItemModal();

      if (typeof caricaItems === "function") caricaItems();
    }
  } catch (error) {
    console.error("Errore durante il salvataggio dell'item:", error);
    showToast("Errore di rete durante il salvataggio nel database.", "error");
  }
}

// ─── AGGIORNAMENTO TAB "I MIEI CONTENUTI" (CON ITEM ACQUISTATI) ───
// ─── AGGIORNAMENTO TAB "I MIEI CONTENUTI" (CON ITEM ACQUISTATI) ───
async function caricaMieiContenuti() {
  const u = getUtenteCorrente();
  const container = document.getElementById("mieiContenuti");

  if (!u) {
    container.innerHTML = `
      <div class="aa-empty">
        <div class="aa-empty-icon">🔐</div>
        <h5>Accesso richiesto</h5>
        <p>Effettua il login per vedere i tuoi contenuti.</p>
        <a href="/" class="btn-aa-primary">Vai al login</a>
      </div>`;
    return;
  }

  container.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  // Scarichiamo i dati in parallelo dal server
  const [dataItems, dataVisiteCreate, dataVisiteAdottate] = await Promise.all([
    apiFetch(`/api/items?pubblicato=tutti&limite=100`),
    apiFetch(`/api/visite?pubblica=tutti&creatorId=${u._id}&limite=100`),
    apiFetch(`/api/visite?soloMie=true&limite=100`),
  ]);

  // 1. ITEMS CREATI DA ME
  const mieiItemsCreati = dataItems?.items
    ? dataItems.items.filter((i) => (i.creatorId?._id || i.creatorId) === u._id)
    : [];

  // 2. ITEMS ACQUISTATI/ADOTTATI DA ALTRI (cerchiamo se il nostro ID è nei logVendite)
  const mieiItemsAcquistati = dataItems?.items
    ? dataItems.items.filter((i) => {
        const nonMio = (i.creatorId?._id || i.creatorId) !== u._id;
        const acquistato = i.logVendite?.some(
          (log) => (log.acquirenteId?._id || log.acquirenteId) === u._id,
        );
        return nonMio && acquistato;
      })
    : [];

  // 3. VISITE CREATE DA ME
  const mieVisiteCreate = dataVisiteCreate?.visite || [];

  // 4. VISITE ACQUISTATE/ADOTTATE DA ALTRI
  const mieVisiteAcquistate = dataVisiteAdottate?.visite
    ? dataVisiteAdottate.visite.filter((v) => {
        const nonMia = v.creatorId?._id !== u._id && v.creatorId !== u._id;
        const adottataRealmente =
          Array.isArray(v.logAdozioni) &&
          v.logAdozioni.some(
            (log) => (log.adottanteId?._id || log.adottanteId) === u._id,
          );
        return nonMia && adottataRealmente;
      })
    : [];

  // --- CASO 1: AUTORE / ADMIN ---
  if (["autore", "admin"].includes(u.ruolo)) {
    if (
      !mieiItemsCreati.length &&
      !mieiItemsAcquistati.length &&
      !mieVisiteCreate.length &&
      !mieVisiteAcquistate.length
    ) {
      container.innerHTML = `
        <div class="aa-empty">
          <div class="aa-empty-icon">✏️</div>
          <h5>Nessun contenuto</h5>
          <p>Inizia a creare contenuti o adotta guide e item dal catalogo.</p>
        </div>`;
      return;
    }

    let htmlRisultato = "";

    // Sezione: Item Creati
    if (mieiItemsCreati.length > 0) {
      htmlRisultato += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-collection"></i> I miei Item Creati (${mieiItemsCreati.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo</th><th>Museo</th><th>Linguaggio</th><th>Stato</th><th>Azioni</th></tr></thead>
              <tbody>
                ${mieiItemsCreati
                  .map(
                    (item) => `
                  <tr>
                    <td><strong>${item.titolo}</strong><br><small class="text-slate">${item.operaId}</small></td>
                    <td><small>${item.museo}</small></td>
                    <td>${badgeLinguaggio(item.linguaggio)}</td>
                    <td><span class="aa-badge ${item.pubblicato ? "aa-badge-free" : "aa-badge-len"}">${item.pubblicato ? "Pubblicato" : "Bozza"}</span></td>
                    <td><a href="/editor-item?id=${item._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a></td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // 🛠️ SEZIONE CORRETTA: Item Acquistati / Adottati per Autori con BOTTONE VISUALIZZA
    if (mieiItemsAcquistati.length > 0) {
      htmlRisultato += `
        <div class="aa-card mb-4">
          <div class="aa-card-header" style="background: var(--aa-gold-pale);"><i class="bi bi-bag-check"></i> Item Adottati / Acquistati (${mieiItemsAcquistati.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Item</th><th>Museo</th><th>Autore Originale</th><th>Linguaggio</th><th>Azioni</th></tr></thead>
              <tbody>
                ${mieiItemsAcquistati
                  .map(
                    (item) => `
                  <tr>
                    <td><strong>${item.titolo}</strong></td>
                    <td><small>${item.museo}</small></td>
                    <td><span class="text-taupe">${item.autore_visita || "Community"}</span></td>
                    <td>${badgeLinguaggio(item.linguaggio)}</td>
                    <td>
                      <button class="btn-aa-primary" style="font-size:0.75rem;padding:2px 8px" onclick="apriItemModal('${item._id}')">Visualizza</button>
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
    }

    // Sezione: Visite Create
    if (mieVisiteCreate.length > 0) {
      htmlRisultato += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-map"></i> Le mie Visite Create (${mieVisiteCreate.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Visita</th><th>Museo</th><th>Tappe</th><th>Azioni</th></tr></thead>
              <tbody>
                ${mieVisiteCreate
                  .map((v) => {
                    const numTappe = v.tappe?.length || 0;
                    return `
                        <tr>
                          <td><strong>${v.titolo || v.title || "Senza titolo"}</strong></td>
                          <td><small>${v.museo}</small></td>
                          <td><span class="aa-badge aa-badge-len">${numTappe} ${numTappe === 1 ? "tappa" : "tappe"}</span></td>
                          <td><a href="/editor-visita?id=${v._id}" class="btn-aa-outline" style="font-size:0.75rem;padding:2px 8px">Modifica</a></td>
                        </tr>
                      `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Sezione: Visite Acquistate
    if (mieVisiteAcquistate.length > 0) {
      htmlRisultato += `
        <div class="aa-card">
          <div class="aa-card-header" style="background: var(--aa-gold-pale);"><i class="bi bi-bag-heart"></i> Visite Adottate / Acquistate (${mieVisiteAcquistate.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead><tr><th>Titolo Visita</th><th>Museo</th><th>Tappe</th><th>Azioni</th></tr></thead>
              <tbody>
                ${mieVisiteAcquistate
                  .map((v) => {
                    const numTappe = v.tappe?.length || 0;
                    return `
                        <tr>
                          <td><strong>${v.titolo || v.title || "Senza titolo"}</strong></td>
                          <td><small>${v.museo}</small></td>
                          <td><span class="aa-badge aa-badge-len">${numTappe} ${numTappe === 1 ? "tappa" : "tappe"}</span></td>
                          <td><a href="/editor-visita?id=${v._id}" class="btn-aa-gold" style="font-size:0.75rem;padding:2px 10px">Personalizza</a></td>
                        </tr>
                      `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = htmlRisultato;
  } else {
    // --- CASO 2: VISITATORE SEMPLICE ---
    if (!mieVisiteAcquistate.length && !mieiItemsAcquistati.length) {
      container.innerHTML = `
        <div class="aa-empty">
          <div class="aa-empty-icon">👤</div>
          <h5>La tua area personale è vuota</h5>
          <p>Esplora il catalogo per adottare guide ed elementi multimediali.</p>
        </div>`;
      return;
    }

    let htmlVisitatore = "";

    if (mieVisiteAcquistate.length > 0) {
      htmlVisitatore += `
        <div class="aa-card mb-4">
          <div class="aa-card-header"><i class="bi bi-bookmark-star"></i> Le mie Visite Adottate (${mieVisiteAcquistate.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead>
                <tr>
                  <th>Percorso Museale</th>
                  <th>Istituzione</th>
                  <th>Tappe</th>
                  <th class="d-none d-md-table-cell">Opzioni</th>
                </tr>
              </thead>
              <tbody>
                ${mieVisiteAcquistate
                  .map((v) => {
                    const numTappe = v.tappe?.length || 0;
                    const stringaStops = `${numTappe} ${numTappe === 1 ? "stop" : "stops"}`;
                    return `
                        <tr class="aa-row-clickable-mobile" onclick="if(window.innerWidth < 768) apriVisitaModal('${v._id}')">
                          <td><strong>${v.titolo || v.title || "Senza titolo"}</strong></td>
                          <td><small>${v.museo}</small></td>
                          <td>
                            <span class="aa-badge aa-badge-len d-none d-md-inline-flex">${stringaStops}</span>
                            <span class="aa-badge aa-badge-len d-inline-flex d-md-none fw-bold" style="padding: 2px 8px">${numTappe}</span>
                          </td>
                          <td class="d-none d-md-table-cell">
                            <button class="btn-aa-primary" style="font-size:0.75rem; padding:3px 10px;" onclick="apriVisitaModal('${v._id}')">
                              Visualizza
                            </button>
                          </td>
                        </tr>
                      `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (mieiItemsAcquistati.length > 0) {
      htmlVisitatore += `
        <div class="aa-card">
          <div class="aa-card-header"><i class="bi bi-file-earmark-music"></i> I miei Contenuti Audio Singoli (${mieiItemsAcquistati.length})</div>
          <div class="aa-card-body p-0" style="overflow-x:auto;">
            <table class="aa-table">
              <thead>
                <tr>
                  <th>Opera</th>
                  <th>Museo</th>
                  <th>Linguaggio</th>
                  <th class="d-none d-md-table-cell">Dettagli</th>
                </tr>
              </thead>
              <tbody>
                ${mieiItemsAcquistati
                  .map(
                    (item) => `
                  <tr class="aa-row-clickable-mobile" onclick="if(window.innerWidth < 768) apriItemModal('${item._id}')">
                    <td><strong>${item.titolo}</strong></td>
                    <td><small>${item.museo}</small></td>
                    <td>${badgeLinguaggio(item.linguaggio)}</td>
                    <td class="d-none d-md-table-cell">
                      <button class="btn-aa-primary" style="font-size:0.75rem; padding:3px 10px" onclick="apriItemModal('${item._id}')">
                        Visualizza
                      </button>
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
    }

    container.innerHTML = htmlVisitatore;
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

// ─── LOG VENDITE CON RECOVERY DEGLI USERNAME DA ID STRINGA ───
async function apriLogModal() {
  document.getElementById("logModal").classList.remove("d-none");
  const body = document.getElementById("logBody");
  body.innerHTML =
    '<div class="text-center py-4"><div class="aa-spinner"></div></div>';

  const u = getUtenteCorrente();
  if (!u) {
    body.innerHTML =
      '<div class="aa-empty"><p>Effettua il login per consultare i log.</p></div>';
    return;
  }

  // 🛠️ SCARICHIAMO ANCHE LA LISTA UTENTI IN PARALLELO
  const [dataItems, dataVisite, dataUtenti] = await Promise.all([
    apiFetch("/api/items?pubblicato=tutti&limite=500"),
    apiFetch(`/api/visite?pubblica=tutti&creatorId=${u._id}&limite=500`),
    apiFetch("/api/utenti"), // Recupera l'elenco di tutti gli account del sistema
  ]);

  // Creiamo una mappa rapida ID -> Username per convertire al volo le stringhe orfane
  const mappaUtenti = {};
  if (dataUtenti && Array.isArray(dataUtenti)) {
    dataUtenti.forEach((user) => {
      if (user._id) mappaUtenti[String(user._id)] = user.username;
    });
  }

  let rows = "";
  let totaleGuadagnato = 0;

  // 1. FILTRAGGIO LOG VENDITE - ITEM DELL'AUTORE
  if (dataItems && dataItems.items) {
    dataItems.items.forEach((item) => {
      const idCreatore = item.creatorId?._id || item.creatorId;
      if (idCreatore === u._id && Array.isArray(item.logVendite)) {
        item.logVendite.forEach((log) => {
          const idAcquirenteObj = log.acquirenteId;
          const idAcquirenteStr = String(
            idAcquirenteObj?._id || idAcquirenteObj || "",
          );

          if (idAcquirenteStr && idAcquirenteStr !== String(u._id)) {
            const importo = Number(log.prezzo || 0);
            totaleGuadagnato += importo;

            // Recupero nome: prima prova dal populate nativo, poi dalla mappa, infine fallback anonimo
            const nomeAcquirente =
              idAcquirenteObj?.username ||
              mappaUtenti[idAcquirenteStr] ||
              "Utente Anonimo";

            rows += `
              <tr>
                <td><span class="aa-badge aa-badge-len"><i class="bi bi-file-earmark-music"></i> Item</span></td>
                <td><strong>${item.titolo}</strong><br><small class="text-slate">${item.operaId || "–"}</small></td>
                <td><span class="text-taupe fw-medium">${nomeAcquirente}</span></td>
                <td><span class="aa-badge ${importo > 0 ? "aa-badge-paid" : "aa-badge-free"}">${importo > 0 ? "Vendita" : "Adozione"}</span></td>
                <td class="fw-bold text-charcoal">${importo > 0 ? "€ " + importo.toFixed(2) : "Gratis"}</td>
                <td><small class="text-slate">${log.dataAcquisto ? new Date(log.dataAcquisto).toLocaleDateString("it-IT") : "–"}</small></td>
              </tr>
            `;
          }
        });
      }
    });
  }

  // 2. FILTRAGGIO LOG VENDITE - VISITE DELL'AUTORE
  if (dataVisite && dataVisite.visite) {
    dataVisite.visite.forEach((visita) => {
      if (Array.isArray(visita.logAdozioni)) {
        visita.logAdozioni.forEach((log) => {
          const idAdottanteObj = log.adottanteId;
          const idAdottanteStr = String(
            idAdottanteObj?._id || idAdottanteObj || "",
          );

          if (idAdottanteStr && idAdottanteStr !== String(u._id)) {
            const importo = Number(visita.prezzo || 0);
            totaleGuadagnato += importo;

            // 🛠️ RISOLUZIONE MANUALE DELLO USERNAME
            // Se Mongoose restituisce solo la stringa dell'ID, la cerchiamo dentro la mappa utenti
            const nomeAcquirente =
              idAdottanteObj?.username ||
              mappaUtenti[idAdottanteStr] ||
              "Utente Anonimo";

            rows += `
              <tr>
                <td><span class="aa-badge aa-badge-paid" style="background:#edf2f7; color:#2b6cb0;"><i class="bi bi-map"></i> Visita</span></td>
                <td><strong>${visita.titolo || visita.title || "Visita senza nome"}</strong><br><small class="text-slate">${visita.museo}</small></td>
                <td><span class="text-taupe fw-medium"> ${nomeAcquirente}</span></td>
                <td><span class="aa-badge ${importo > 0 ? "aa-badge-paid" : "aa-badge-free"}">${importo > 0 ? "Vendita" : "Adozione"}</span></td>
                <td class="fw-bold text-charcoal">${importo > 0 ? "€ " + importo.toFixed(2) : "Gratis"}</td>
                <td><small class="text-slate">${log.dataAdozione ? new Date(log.dataAdozione).toLocaleDateString("it-IT") : "–"}</small></td>
              </tr>
            `;
          }
        });
      }
    });
  }

  // RENDER FINALE
  if (!rows) {
    body.innerHTML =
      '<div class="aa-empty"><div class="aa-empty-icon">📊</div><h5>Nessun movimento</h5><p>I tuoi contenuti non sono ancora stati acquistati o adottati da altri utenti.</p></div>';
    return;
  }

  body.innerHTML = `
    <div class="p-3 mb-3 rounded bg-cream border border-soft d-flex justify-content-between align-items-center">
       <div>
         <span class="aa-label m-0" style="font-size:0.65rem;">Account Monitorato</span>
         <div class="fw-bold text-charcoal" style="font-size:1.1rem;"> ${u.username}</div>
       </div>
       <div class="text-end">
         <span class="aa-label m-0" style="font-size:0.65rem;">Totale Incassato</span>
         <div class="fw-bold text-success" style="font-size:1.25rem;">€ ${totaleGuadagnato.toFixed(2)}</div>
       </div>
    </div>

    <div style="overflow-x:auto">
      <table class="aa-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Contenuto Canale</th>
            <th>Acquirente</th>
            <th>Modalità</th>
            <th>Corrispettivo</th>
            <th>Data Evento</th>
          </tr>
        </thead>
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

// Gestisce l'animazione della freccia dei filtri su mobile
function ruotaFrecciaFiltri() {
  const freccia = document.getElementById("frecciaFiltri");
  if (!freccia) return;

  setTimeout(() => {
    const collapeElement = document.getElementById("collapseFiltri");
    if (collapeElement && collapeElement.classList.contains("show")) {
      freccia.style.transform = "rotate(180deg)";
    } else {
      freccia.style.transform = "rotate(0deg)";
    }
  }, 150); // Piccolo ritardo per dare il tempo a Bootstrap di assegnare le classi CSS di transizione
}
