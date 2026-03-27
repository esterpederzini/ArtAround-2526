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
function getUtenteCorrente() {
  try {
    return JSON.parse(localStorage.getItem("aa_utente"));
  } catch {
    return null;
  }
}

function getAuthToken() {
  const token = localStorage.getItem("aa_token");
  if (token) return token;

  // Backward-compatible fallback for navigator-style session object.
  try {
    const session = JSON.parse(localStorage.getItem("user_session"));
    return session?.token || null;
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

// ─── UI UTENTE NAVBAR ────────────────────────────────
(function inizializzaNavbar() {
  const utenteInfo = document.getElementById("utenteInfo");
  if (utenteInfo) {
    const u = getUtenteCorrente();
    utenteInfo.textContent = u ? `${u.username} (${u.ruolo})` : "";
  }
})();
