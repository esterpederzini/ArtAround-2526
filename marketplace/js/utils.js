/* ═══════════════════════════════════════════════════
   utils.js – Funzioni condivise ArtAround
   ═══════════════════════════════════════════════════ */

// ─── API FETCH ──────────────────────────────────────
async function apiFetch(url, opzioni = {}) {
  try {
    const token = getAuthToken();
    const headers = { ...(opzioni.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const risposta = await fetch(url, { ...opzioni, headers });

    // ─── GESTIONE SCADENZA SESSIONE (401) ───────────────
    if (risposta.status === 401) {
      showToast("Sessione scaduta. Verrai reindirizzato al login...", "error");

      // Rimuoviamo i dati della sessione obsoleta
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session"); // per sicurezza e retrocompatibilità

      if (typeof aggiornaUiNavbar === "function") {
        aggiornaUiNavbar();
      }

      // Aspettiamo un secondo per dare il tempo all'utente di leggere il messaggio e poi reindirizziamo
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

      return null;
    }
    // ────────────────────────────────────────────────────

    const json = await risposta.json();
    if (!risposta.ok || !json.successo) {
      showToast(json.messaggio || "Errore API", "error");
      return null;
    }
    return json.data;
  } catch (err) {
    console.error("Errore fetch:", err);
    showToast("Errore di connessione al server", "error");
    return null;
  }
}

// ─── TOAST ──────────────────────────────────────────
function showToast(messaggio, tipo = "info", durata = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icone = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `aa-toast ${tipo}`;
  toast.innerHTML = `<span style="font-size:1.1rem;font-weight:700">${icone[tipo] || "ℹ"}</span><span>${messaggio}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, durata);
}

// ─── AUTH ────────────────────────────────────────────
function getAuthToken() {
  try {
    return localStorage.getItem("aa_token");
  } catch {
    return null;
  }
}

function isTokenScaduto(token) {
  if (!token) return true;
  try {
    // Il JWT è composto da tre parti separate da un punto. La seconda è il payload.
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));

    // Il timestamp di scadenza del JWT (exp) è in secondi, Date.now() in millisecondi
    const adesso = Math.floor(Date.now() / 1000);
    return payload.exp < adesso;
  } catch (e) {
    return true; // Se il token è corrotto o non valido, consideralo scaduto
  }
}

function getUtenteCorrente() {
  try {
    const token = getAuthToken();
    // Se c'è un token ma è scaduto, pulisci tutto SUBITO prima che il resto della pagina si carichi
    if (token && isTokenScaduto(token)) {
      console.warn("Rilevato token scaduto all'avvio. Svuoto la sessione.");
      localStorage.removeItem("aa_token");
      localStorage.removeItem("aa_utente");
      localStorage.removeItem("user_session");
      return null;
    }
    return JSON.parse(localStorage.getItem("aa_utente"));
  } catch {
    return null;
  }
}

function richiedeAutore() {
  const u = getUtenteCorrente();
  if (!u || !["autore", "admin"].includes(u.ruolo)) {
    showToast("Accesso riservato agli autori", "error");
    return false;
  }
  return true;
}

// ─── BADGE ──────────────────────────────────────────
function badgeLinguaggio(linguaggio) {
  return `<span class="aa-badge aa-badge-lang-${linguaggio}">${linguaggio}</span>`;
}

function badgeLunghezza(lunghezza) {
  return `<span class="aa-badge aa-badge-len"><i class="bi bi-clock"></i> ${lunghezza}</span>`;
}

function badgePrezzo(prezzo) {
  if (prezzo === 0 || prezzo === undefined) {
    return `<span class="aa-badge aa-badge-free">Gratuito</span>`;
  }
  return `<span class="aa-price">€ ${Number(prezzo).toFixed(2)}</span>`;
}

// ─── PAGINATOR ──────────────────────────────────────
function renderPaginazione(
  containerId,
  paginaCorrente,
  totalePagine,
  callbackCambia,
) {
  const container = document.getElementById(containerId);
  if (!container || totalePagine <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";
  html += `<button class="aa-page-btn" ${paginaCorrente <= 1 ? "disabled" : ""} onclick="${callbackCambia}(${paginaCorrente - 1})">‹</button>`;

  for (let i = 1; i <= totalePagine; i++) {
    if (
      i === 1 ||
      i === totalePagine ||
      (i >= paginaCorrente - 1 && i <= paginaCorrente + 1)
    ) {
      html += `<button class="aa-page-btn ${i === paginaCorrente ? "active" : ""}" onclick="${callbackCambia}(${i})">${i}</button>`;
    } else if (i === paginaCorrente - 2 || i === paginaCorrente + 2) {
      html += `<span style="padding:0 4px;color:var(--aa-taupe)">…</span>`;
    }
  }

  html += `<button class="aa-page-btn" ${paginaCorrente >= totalePagine ? "disabled" : ""} onclick="${callbackCambia}(${paginaCorrente + 1})">›</button>`;
  container.innerHTML = html;
}

// ─── DURATA STIMATA ──────────────────────────────────
function lunghezzaInMinuti(lunghezza) {
  const mappa = {
    "3s": 0.05,
    "15s": 0.25,
    "30s": 0.5,
    "40s": 0.67,
    "1m": 1,
    "3m": 3,
    "5m": 5,
    "10m": 10,
  };
  return mappa[lunghezza] || 1;
}

// ─── DEBOUNCE ────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── CONFIGURAZIONE MUSEO ────────────────────────────
let configMuseo = null;

// utils.js — funzione caricaConfigMuseo aggiornata
async function caricaConfigMuseo() {
  try {
    const configPaths = [
      "/api/config", // ← aggiungi questo per primo
      "/config.json",
      "/marketplace/config.json",
      "../config.json",
    ];

    let response;
    for (const path of configPaths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        continue;
      }
    }

    if (!response || !response.ok) throw new Error("Config non trovata");

    configMuseo = await response.json();
    applicaTemaMuseo();
    return configMuseo;
  } catch (err) {
    console.error("Errore caricamento config:", err);
    showToast("Errore nel caricamento della configurazione del museo", "error");
    return null;
  }
}

function getConfigMuseo() {
  return configMuseo;
}

function applicaTemaMuseo() {
  if (!configMuseo) return;

  // Applica colori del museo
  if (configMuseo.colori) {
    document.documentElement.style.setProperty(
      "--aa-museum-primary",
      configMuseo.colori.primario || "#b8962e",
    );
    document.documentElement.style.setProperty(
      "--aa-museum-secondary",
      configMuseo.colori.secondario || "#2c2c2c",
    );
  }

  // Aggiorna titolo della pagina
  const museoNome = configMuseo.museo || "Museo";
  document.title = `ArtAround – ${museoNome}`;
}

// ─── UI UTENTE NAVBAR ────────────────────────────────
function aggiornaUiNavbar() {
  const utenteInfo = document.getElementById("utenteInfo");
  if (utenteInfo) {
    const u = getUtenteCorrente();
    utenteInfo.textContent = u ? `${u.username} (${u.ruolo})` : "";
  }
}

// La eseguiamo comunque all'avvio
aggiornaUiNavbar();
