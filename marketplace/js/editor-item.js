/* ═══════════════════════════════════════════════════
   editor-item.js – Logica Editor Item ArtAround
   ═══════════════════════════════════════════════════ */

let museoConfigurato = "";
let mappaOpereLocali = {}; // Mappa per l'autocompilazione immediata client-side

// ─── INIT ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Controllo di sicurezza basato sui ruoli
  if (!richiedeAutore()) {
    const container =
      document.querySelector(".container") ||
      document.querySelector(".container-fluid");
    if (container) {
      container.innerHTML = `
        <div class="row justify-content-center align-items-center" style="min-height: 60vh;">
          <div class="col-md-8 col-lg-6 text-center">
            <div style="font-size: 5rem; margin-bottom: 1rem;">🎨</div>
            <h2 style="color: var(--aa-gold); font-family: 'Playfair Display', serif;">
              L'ispirazione ha bussato, ma serve il pass!
            </h2>
            <p class="lead mt-3 text-slate">
              Attualmente stai esplorando ArtAround come <strong>Visitatore</strong>.
            </p>
            <p class="mb-4">
              Solo gli utenti con il ruolo di <strong>Autore</strong> possono scolpire nuovi contenuti, progettare percorsi museali e condividerli con la community.
            </p>
            <a href="/dashboard" class="btn-aa-primary mt-2">
              <i class="bi bi-arrow-left"></i> Torna alla Dashboard
            </a>
          </div>
        </div>
      `;
    }
    return;
  }

  // 2. Carica configurazione statica e sessione utente corrente
  await inizializzaMuseoDaConfig();

  const utente = getUtenteCorrente();
  const inputAutore = document.getElementById("autoreId");
  if (inputAutore && utente) {
    inputAutore.value = utente._id;
  }

  // 3. Popola dinamicamente il menu a tendina delle opere disponibili
  await popolaSelectOpere();

  // 4. Listener per l'anteprima live dinamica delle card
  [
    "titolo",
    "descrizione",
    "lunghezza",
    "linguaggio",
    "licenzaTipo",
    "prezzo",
    "immagineUrl",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", aggiornaPreview);
  });

  // 5. Gestione conteggio caratteri e calcolo automatico profondità
  document.getElementById("descrizione")?.addEventListener("input", (e) => {
    const len = e.target.value.length;
    document.getElementById("charCount").textContent = len;

    const prof = stimaProfondita(len);
    document.getElementById("profonditaPreview").textContent = prof;
    document.getElementById("profonditaContenuto").value = prof;
  });

  // 6. REATTIVITÀ DEL MENU A TENDINA: Gestisce il cambio di selezione dell'opera
  document.getElementById("operaSelect")?.addEventListener("change", (e) => {
    const valoreScelto = e.target.value;
    gestisciCambioSelezioneOpera(valoreScelto);
  });

  // 7. Anteprima Live miniatura immagine con debounce
  document.getElementById("immagineUrl")?.addEventListener(
    "input",
    debounce((e) => {
      aggiornaPreview();
    }, 400),
  );

  // 8. Gestione modalità modifica se presente id nell'URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) caricaItemPerModifica(params.get("id"));
});

// ─── CARICA CONFIGURAZIONE MUSEO DAL SERVER ──────────
async function inizializzaMuseoDaConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      console.warn("File config.json non raggiungibile via API.");
      return;
    }
    const config = await response.json();
    if (config && config.museo) {
      museoConfigurato = config.museo;
      const inputMuseo = document.getElementById("museo");
      if (inputMuseo) {
        inputMuseo.value = museoConfigurato;
      }
    }
  } catch (error) {
    console.error("Errore nel caricamento del modulo config:", error);
  }
}

// ─── POPOLA IL MENU A TENDINA DELLE OPERE ────────────
async function popolaSelectOpere() {
  const select = document.getElementById("operaSelect");
  if (!select) return;

  // Richiediamo gli item esistenti per catalogare le opere attuali del museo
  const data = await apiFetch(
    `/api/items?museo=${encodeURIComponent(museoConfigurato)}&limite=300`,
  );
  select.innerHTML = "";

  // Opzioni predefinite di cortesia e inserimento
  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "-- Scegli un'opera dall'elenco --";
  select.appendChild(optDefault);

  const optNuova = document.createElement("option");
  optNuova.value = "__NEW__";
  optNuova.textContent = "[+ Censisci Nuova Opera non in elenco]";
  select.appendChild(optNuova);

  if (!data || !data.items || data.items.length === 0) {
    mappaOpereLocali = {};
    return;
  }

  // Estraiamo le opere in modo univoco filtrando per operaId
  mappaOpereLocali = {};
  data.items.forEach((item) => {
    if (item.operaId && !mappaOpereLocali[item.operaId]) {
      mappaOpereLocali[item.operaId] = item;
    }
  });

  // Generiamo i nodi option grafici
  Object.keys(mappaOpereLocali).forEach((operaId) => {
    const opera = mappaOpereLocali[operaId];
    const opt = document.createElement("option");
    opt.value = operaId;
    opt.textContent = `${opera.titolo || "Opera senza titolo"} (${operaId})`;
    select.appendChild(opt);
  });
}

// ─── GESTISCE IL CAMBIO DI SELEZIONE NEL MENU ────────
async function gestisciCambioSelezioneOpera(valoreScelto) {
  const badge = document.getElementById("operaStatoBadge");
  const inputOperaIdNascosto = document.getElementById("operaId");
  const campiSchedaTecnica = [
    "artista",
    "stile",
    "periodo",
    "titolo",
    "categoria",
  ];

  if (valoreScelto === "__NEW__") {
    // Caso A: L'autore dichiara una nuova opera via Prompt
    const nuovoCodice = prompt(
      "Inserisci il codice ID alfanumerico per la nuova opera (es. ME-005):",
    );

    if (!nuovoCodice || nuovoCodice.trim() === "") {
      document.getElementById("operaSelect").value = "";
      gestisciCambioSelezioneOpera("");
      return;
    }

    const codicePulito = nuovoCodice.trim().toUpperCase();

    // Validazione preventiva anti-duplicati localizzati
    if (mappaOpereLocali[codicePulito]) {
      showToast(
        "Questo ID esiste già! Selezionalo direttamente dal menu a tendina.",
        "error",
      );
      document.getElementById("operaSelect").value = codicePulito;
      gestisciCambioSelezioneOpera(codicePulito);
      return;
    }

    inputOperaIdNascosto.value = codicePulito;

    badge.textContent = `Nuova Opera: ${codicePulito}`;
    badge.className = "badge ms-2 bg-warning text-dark";
    badge.classList.remove("d-none");

    // Sblocchiamo i campi per registrare la prima occorrenza storica
    disabilitaCampiOpere(campiSchedaTecnica, false);

    campiSchedaTecnica.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = id === "categoria" ? "pittura" : "";
    });

    document.getElementById("variantiList").innerHTML =
      '<em class="text-slate small">Prima occorrenza. Questa opera verrà registrata per la prima volta.</em>';
  } else if (valoreScelto && valoreScelto !== "") {
    // Caso B: È stata scelta un'opera esistente
    inputOperaIdNascosto.value = valoreScelto;

    badge.textContent = "Opera Catalogata";
    badge.className = "badge ms-2 bg-success text-white";
    badge.classList.remove("d-none");

    // Recuperiamo i dettagli immutabili condivisi dall'opera
    const operaSelezionata = mappaOpereLocali[valoreScelto];

    document.getElementById("artista").value =
      operaSelezionata.artista || operaSelezionata.artist || "";
    document.getElementById("stile").value =
      operaSelezionata.stile || operaSelezionata.style || "";
    document.getElementById("periodo").value =
      operaSelezionata.periodo || operaSelezionata.period || "";
    document.getElementById("titolo").value = operaSelezionata.titolo || "";
    document.getElementById("categoria").value =
      operaSelezionata.categoria || "pittura";

    if (operaSelezionata.immagine) {
      document.getElementById("immagineUrl").value = operaSelezionata.immagine;
    }

    // Blindiamo la scheda tecnica dell'opera in sola lettura
    disabilitaCampiOpere(campiSchedaTecnica, true);

    // Scarichiamo dinamicamente l'elenco delle spiegazioni concorrenti per la barra laterale
    const dataVarianti = await apiFetch(
      `/api/items?operaId=${encodeURIComponent(valoreScelto)}&limite=50`,
    );
    if (dataVarianti && dataVarianti.items) {
      renderElencoVarianti(dataVarianti.items);
    }
  } else {
    // Caso C: Reset o selezione vuota
    inputOperaIdNascosto.value = "";
    badge.classList.add("d-none");
    disabilitaCampiOpere(campiSchedaTecnica, false);
    document.getElementById("variantiList").innerHTML =
      '<em class="text-slate small">Seleziona un\'opera per esaminare le varianti...</em>';
  }

  aggiornaPreview();
}

function disabilitaCampiOpere(listaCampi, bloccati) {
  listaCampi.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = bloccati;
      if (el.tagName === "SELECT") el.disabled = bloccati;

      // Feedback visivo di sicurezza
      el.style.backgroundColor = bloccati ? "var(--aa-cream)" : "";
      el.style.cursor = bloccati ? "not-allowed" : "";
    }
  });
}

function renderElencoVarianti(items) {
  const container = document.getElementById("variantiList");
  const currentItemId = document.getElementById("itemId").value;

  const filtrate = items.filter((i) => i._id !== currentItemId);
  if (!filtrate.length) {
    container.innerHTML =
      '<em class="text-slate small">Nessuna spiegazione alternativa registrata oltre a questa.</em>';
    return;
  }

  container.innerHTML = filtrate
    .map(
      (v) => `
    <div class="d-flex align-items-center gap-2 mb-1 p-1 rounded" style="background:var(--aa-cream); font-size: 0.8rem">
      <div class="flex-grow-1 min-w-0">
        <div class="text-truncate"><strong>Target:</strong> ${v.linguaggio}</div>
        <div class="text-slate" style="font-size:0.7rem">${v.lunghezza} · Licenza: ${v.licenza?.tipo || "Libera"}</div>
      </div>
      <a href="/editor-item?id=${v._id}" class="btn-aa-outline" style="font-size:0.68rem;padding:2px 6px">✎ Modifica</a>
    </div>
  `,
    )
    .join("");
}

// ─── LIVE PREVIEW DELLE CARD ─────────────────────────
function aggiornaPreview() {
  const titolo = document.getElementById("titolo").value || "Titolo item";
  const desc =
    document.getElementById("descrizione").value ||
    "La descrizione apparirà qui...";
  const linguaggio = document.getElementById("linguaggio").value;
  const lunghezza = document.getElementById("lunghezza").value;
  const prezzo = Number(document.getElementById("prezzo").value) || 0;
  const licenza = document.getElementById("licenzaTipo").value;
  const imgUrl = document.getElementById("immagineUrl").value.trim();

  document.getElementById("prevTitolo").textContent = titolo;
  document.getElementById("prevDesc").textContent =
    desc.substring(0, 100) + (desc.length > 100 ? "…" : "");
  document.getElementById("prevLen").textContent = lunghezza;
  document.getElementById("prevLicenza").textContent = licenza;

  const prevLang = document.getElementById("prevLang");
  if (prevLang) {
    prevLang.textContent = linguaggio;
    prevLang.className = `aa-badge aa-badge-lang-${linguaggio}`;
  }

  const prevPrice = document.getElementById("prevPrice");
  if (prevPrice) {
    if (prezzo === 0) {
      prevPrice.className = "aa-badge aa-badge-free";
      prevPrice.textContent = "Gratuito";
    } else {
      prevPrice.className = "aa-price";
      prevPrice.textContent = `€ ${prezzo.toFixed(2)}`;
    }
  }

  const prevImg = document.getElementById("prevImg");
  if (prevImg) {
    if (imgUrl) {
      prevImg.innerHTML = `<img src="${imgUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:6px 6px 0 0">`;
    } else {
      prevImg.innerHTML = "🖼️";
    }
  }
}

function stimaProfondita(len) {
  if (len < 120) return "superficiale";
  if (len < 350) return "standard";
  if (len < 750) return "approfondito";
  return "accademico";
}

// ─── INVIO E SALVATAGGIO DEI DATI ─────────────────────
async function salvaItem() {
  const operaId = document.getElementById("operaId").value.trim();
  const museo = document.getElementById("museo").value.trim();
  const titolo = document.getElementById("titolo").value.trim();
  const autoreId = document.getElementById("autoreId").value;
  const desc = document.getElementById("descrizione").value.trim();
  const lunghezza = document.getElementById("lunghezza").value;
  const linguaggio = document.getElementById("linguaggio").value;
  const categoria = document.getElementById("categoria").value;
  const profondita = document.getElementById("profonditaContenuto").value;
  const tagsRaw = document.getElementById("tags").value;
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const immagineUrl = document.getElementById("immagineUrl").value.trim();
  const licenzaTipo = document.getElementById("licenzaTipo").value;
  const licenzaNote = document.getElementById("licenzaNote").value.trim();
  const prezzo = Number(document.getElementById("prezzo").value) || 0;
  const pubblicato = document.getElementById("pubblicato").checked;
  const id = document.getElementById("itemId").value;

  const artista = document.getElementById("artista").value.trim();
  const stile = document.getElementById("stile").value.trim();
  const periodo = document.getElementById("periodo").value.trim();

  if (!operaId)
    return showToast(
      "Seleziona un'opera o inserisci una nuova coordinata ID.",
      "error",
    );
  if (!titolo)
    return showToast("Il titolo dell'opera o contenuto è necessario.", "error");
  if (!desc)
    return showToast(
      "Scrivi il testo della spiegazione per la guida.",
      "error",
    );
  if (!autoreId)
    return showToast("Sessione autore non valida. Riesegui il login.", "error");

  const payload = {
    operaId,
    museo,
    titolo,
    descrizione: desc,
    lunghezza,
    linguaggio,
    categoria,
    profonditaContenuto: profondita,
    tags,
    immagine: immagineUrl || "/img/default_item_image.jpg",
    licenza: { tipo: licenzaTipo, note: licenzaNote },
    prezzo,
    pubblicato,
    creatorId: autoreId,
    artista,
    stile,
    periodo,
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `/api/items/${id}` : "/api/items";

  const ok = await apiFetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (ok) {
    showToast(
      id
        ? "Spiegazione aggiornata nel database!"
        : "Nuova variante traccia creata con successo!",
      "success",
    );
    if (!id) {
      await popolaSelectOpere(); // Ripopola l'elenco includendo l'eventuale nuova opera creata
      resetForm();
    } else {
      document.getElementById("formTitolo").textContent =
        ` Modifica: ${ok.titolo}`;
    }
  }
}

// ─── CARICA VARIANTE IN MODIFICA VIA URL QUERY ────────
async function caricaItemPerModifica(id) {
  const item = await apiFetch(`/api/items/${id}`);
  if (!item) return;

  document.getElementById("itemId").value = item._id;
  document.getElementById("operaId").value = item.operaId;
  document.getElementById("museo").value = item.museo;
  document.getElementById("titolo").value = item.titolo;
  document.getElementById("autoreId").value =
    item.creatorId?._id || item.creatorId || "";
  document.getElementById("descrizione").value = item.descrizione;
  document.getElementById("lunghezza").value = item.lunghezza;
  document.getElementById("linguaggio").value = item.linguaggio;
  document.getElementById("categoria").value = item.categoria;
  document.getElementById("profonditaContenuto").value =
    item.profonditaContenuto || "standard";
  document.getElementById("tags").value = (item.tags || []).join(", ");
  document.getElementById("immagineUrl").value = item.immagine || "";
  document.getElementById("licenzaTipo").value =
    item.licenza?.tipo || "gratuito";
  document.getElementById("licenzaNote").value = item.licenza?.note || "";
  document.getElementById("prezzo").value = item.prezzo || 0;
  document.getElementById("pubblicato").checked = item.pubblicato !== false;

  document.getElementById("artista").value = item.artista || item.artist || "";
  document.getElementById("stile").value = item.stile || item.style || "";
  document.getElementById("periodo").value = item.periodo || item.period || "";

  document.getElementById("charCount").textContent = item.descrizione.length;
  document.getElementById("profonditaPreview").textContent = stimaProfondita(
    item.descrizione.length,
  );
  document.getElementById("formTitolo").textContent =
    ` Modifica: ${item.titolo}`;

  // Sincronizza l'elemento grafico select con un leggero delay per l'inizializzazione
  setTimeout(() => {
    const select = document.getElementById("operaSelect");
    if (select) {
      select.value = item.operaId;
      disabilitaCampiOpere(
        ["artista", "stile", "periodo", "titolo", "categoria"],
        true,
      );
    }
  }, 400);

  const badge = document.getElementById("operaStatoBadge");
  badge.textContent = "Modalità Modifica";
  badge.className = "badge ms-2 bg-success text-white";
  badge.classList.remove("d-none");

  aggiornaPreview();

  const dataVarianti = await apiFetch(
    `/api/items?operaId=${encodeURIComponent(item.operaId)}&limite=20`,
  );
  if (dataVarianti && dataVarianti.items) {
    renderElencoVarianti(dataVarianti.items);
  }
}

// ─── SVUOTA E RIPRISTINA IL MODULO ────────────────────
function resetForm() {
  const campiDaPulire = [
    "operaId",
    "titolo",
    "descrizione",
    "tags",
    "immagineUrl",
    "licenzaNote",
    "artista",
    "stile",
    "periodo",
    "operaSelect",
  ];
  campiDaPulire.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  disabilitaCampiOpere(
    ["artista", "stile", "periodo", "titolo", "categoria"],
    false,
  );
  document.getElementById("operaStatoBadge").classList.add("d-none");

  inizializzaMuseoDaConfig();
  const utente = getUtenteCorrente();
  if (utente) document.getElementById("autoreId").value = utente._id;

  document.getElementById("lunghezza").value = "3s";
  document.getElementById("linguaggio").value = "medio";
  document.getElementById("categoria").value = "pittura";
  document.getElementById("profonditaContenuto").value = "standard";
  document.getElementById("licenzaTipo").value = "gratuito";
  document.getElementById("prezzo").value = 0;
  document.getElementById("pubblicato").checked = true;
  document.getElementById("itemId").value = "";
  document.getElementById("formTitolo").textContent = " Nuovo Contenuto (Item)";
  document.getElementById("charCount").textContent = "0";
  document.getElementById("profonditaPreview").textContent = "–";
  document.getElementById("variantiList").innerHTML =
    '<em class="text-slate small">Seleziona un\'opera per esaminare le varianti...</em>';

  aggiornaPreview();
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
