/* ═══════════════════════════════════════════════════
   editor-item.js – Logica Editor Item ArtAround
   ═══════════════════════════════════════════════════ */

// ─── INIT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await caricaAutori();
  await caricaMuseiDatalist();

  // Live preview
  ['titolo','descrizione','lunghezza','linguaggio','licenzaTipo','prezzo','immagineUrl'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', aggiornaPreview);
  });

  // Char count
  document.getElementById('descrizione').addEventListener('input', e => {
    const len = e.target.value.length;
    document.getElementById('charCount').textContent = len;
    document.getElementById('profonditaPreview').textContent = stimaProfondita(len);
  });

  // Anteprima immagine
  document.getElementById('immagineUrl').addEventListener('input', debounce(e => {
    const url = e.target.value.trim();
    const prev = document.getElementById('imgPreview');
    if (url) {
      prev.innerHTML = `<img src="${url}" style="width:100%;height:80px;object-fit:cover;border-radius:6px" onerror="this.parentElement.innerHTML='🖼️'">`;
    } else {
      prev.innerHTML = '🖼️';
    }
  }, 400));

  // Varianti per operaId
  document.getElementById('operaId').addEventListener('input', debounce(e => {
    cercaVarianti(e.target.value.trim());
  }, 500));

  // Modifica
  const params = new URLSearchParams(window.location.search);
  if (params.get('id')) caricaItemPerModifica(params.get('id'));
});

// ─── CARICA DATI ────────────────────────────────────
async function caricaAutori() {
  const utenti = await apiFetch('/api/utenti');
  const sel = document.getElementById('autoreId');
  if (!utenti) return;
  utenti.filter(u => ['autore','admin'].includes(u.ruolo)).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u._id; opt.textContent = `${u.username}`;
    sel.appendChild(opt);
  });
  const u = getUtenteCorrente();
  if (u) sel.value = u._id;
}

async function caricaMuseiDatalist() {
  const musei = await apiFetch('/api/musei');
  const dl = document.getElementById('museiList');
  if (!musei || !dl) return;
  musei.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    dl.appendChild(opt);
  });
}

// ─── PREVIEW ────────────────────────────────────────
function aggiornaPreview() {
  const titolo    = document.getElementById('titolo').value || 'Titolo item';
  const desc      = document.getElementById('descrizione').value || 'La descrizione apparirà qui...';
  const linguaggio= document.getElementById('linguaggio').value;
  const lunghezza = document.getElementById('lunghezza').value;
  const prezzo    = Number(document.getElementById('prezzo').value);
  const licenza   = document.getElementById('licenzaTipo').value;
  const imgUrl    = document.getElementById('immagineUrl').value.trim();

  document.getElementById('prevTitolo').textContent  = titolo;
  document.getElementById('prevDesc').textContent    = desc.substring(0,120)+(desc.length>120?'…':'');
  document.getElementById('prevLen').textContent     = lunghezza;
  document.getElementById('prevLicenza').textContent = licenza;

  const prevLang = document.getElementById('prevLang');
  prevLang.textContent = linguaggio;
  prevLang.className   = `aa-badge aa-badge-lang-${linguaggio}`;

  const prevPrice = document.getElementById('prevPrice');
  if (prezzo === 0) {
    prevPrice.className   = 'aa-badge aa-badge-free';
    prevPrice.textContent = 'Gratuito';
  } else {
    prevPrice.className   = 'aa-price';
    prevPrice.textContent = `€ ${prezzo.toFixed(2)}`;
  }

  const prevImg = document.getElementById('prevImg');
  if (imgUrl) {
    prevImg.innerHTML = `<img src="${imgUrl}" style="width:100%;height:160px;object-fit:cover" onerror="this.parentElement.innerHTML='🖼️'">`;
  } else {
    prevImg.innerHTML = '🖼️';
  }
}

function stimaProfondita(len) {
  if (len < 100)  return 'superficiale';
  if (len < 300)  return 'standard';
  if (len < 700)  return 'approfondito';
  return 'accademico';
}

// ─── VARIANTI ────────────────────────────────────────
async function cercaVarianti(operaId) {
  const container = document.getElementById('variantiList');
  if (!operaId) {
    container.innerHTML = '<em class="text-slate small">Inserisci un operaId</em>';
    return;
  }
  const data = await apiFetch(`/api/items?operaId=${encodeURIComponent(operaId)}&limite=10`);
  const attId = document.getElementById('itemId').value;

  // Filtra l'item corrente se stiamo modificando
  const varianti = (data?.items || []).filter(i => i._id !== attId);

  if (!varianti.length) {
    container.innerHTML = '<em class="text-slate small">Prima occorrenza per questo operaId</em>';
    return;
  }

  container.innerHTML = varianti.map(v => `
    <div class="d-flex align-items-center gap-2 mb-1 p-1 rounded" style="background:var(--aa-cream)">
      <div class="flex-grow-1">
        <div style="font-size:0.78rem;font-weight:600">${v.titolo}</div>
        <div style="font-size:0.7rem;color:var(--aa-slate)">${v.linguaggio} · ${v.lunghezza}</div>
      </div>
      <a href="/editor-item?id=${v._id}" class="btn-aa-outline" style="font-size:0.7rem;padding:1px 7px">✎</a>
    </div>
  `).join('');
}

// ─── SALVA ITEM ──────────────────────────────────────
async function salvaItem() {
  const operaId   = document.getElementById('operaId').value.trim();
  const museo     = document.getElementById('museo').value.trim();
  const titolo    = document.getElementById('titolo').value.trim();
  const autoreId  = document.getElementById('autoreId').value;
  const desc      = document.getElementById('descrizione').value.trim();
  const lunghezza = document.getElementById('lunghezza').value;
  const linguaggio= document.getElementById('linguaggio').value;
  const categoria = document.getElementById('categoria').value;
  const profondita= document.getElementById('profonditaContenuto').value;
  const tagsRaw   = document.getElementById('tags').value;
  const tags      = tagsRaw.split(',').map(t=>t.trim()).filter(Boolean);
  const immagine  = document.getElementById('immagineUrl').value.trim() || null;
  const licenzaTipo = document.getElementById('licenzaTipo').value;
  const licenzaNote = document.getElementById('licenzaNote').value.trim();
  const prezzo    = Number(document.getElementById('prezzo').value) || 0;
  const pubblicato= document.getElementById('pubblicato').checked;
  const id        = document.getElementById('itemId').value;

  // Validazione
  if (!operaId) return showToast('operaId obbligatorio', 'error');
  if (!museo)   return showToast('Museo obbligatorio', 'error');
  if (!titolo)  return showToast('Titolo obbligatorio', 'error');
  if (!autoreId)return showToast('Seleziona un autore', 'error');
  if (!desc)    return showToast('Descrizione obbligatoria', 'error');

  const payload = {
    operaId, museo, titolo, autoreId, descrizione: desc,
    lunghezza, linguaggio, categoria,
    profonditaContenuto: profondita,
    tags, immagine,
    licenza: { tipo: licenzaTipo, note: licenzaNote },
    prezzo, pubblicato,
    creatorId: autoreId
  };

  const metodo = id ? 'PUT' : 'POST';
  const url    = id ? `/api/items/${id}` : '/api/items';

  const ok = await apiFetch(url, {
    method: metodo,
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });

  if (ok) {
    showToast(id ? 'Item aggiornato!' : 'Item creato con successo!', 'success');
    if (!id) resetForm();
    else {
      document.getElementById('formTitolo').textContent = ` Modifica: ${ok.titolo}`;
    }
  }
}

// ─── CARICA ITEM PER MODIFICA ────────────────────────
async function caricaItemPerModifica(id) {
  const item = await apiFetch(`/api/items/${id}`);
  if (!item) return;

  document.getElementById('itemId').value           = item._id;
  document.getElementById('operaId').value          = item.operaId;
  document.getElementById('museo').value            = item.museo;
  document.getElementById('titolo').value           = item.titolo;
  document.getElementById('autoreId').value         = item.creatorId?._id || item.creatorId || '';
  document.getElementById('descrizione').value      = item.descrizione;
  document.getElementById('lunghezza').value        = item.lunghezza;
  document.getElementById('linguaggio').value       = item.linguaggio;
  document.getElementById('categoria').value        = item.categoria;
  document.getElementById('profonditaContenuto').value = item.profonditaContenuto;
  document.getElementById('tags').value             = (item.tags||[]).join(', ');
  document.getElementById('immagineUrl').value      = item.immagine || '';
  document.getElementById('licenzaTipo').value      = item.licenza?.tipo || 'gratuito';
  document.getElementById('licenzaNote').value      = item.licenza?.note || '';
  document.getElementById('prezzo').value           = item.prezzo || 0;
  document.getElementById('pubblicato').checked     = item.pubblicato;

  // UI
  document.getElementById('charCount').textContent  = item.descrizione.length;
  document.getElementById('profonditaPreview').textContent = stimaProfondita(item.descrizione.length);
  document.getElementById('formTitolo').textContent = ` Modifica: ${item.titolo}`;

  if (item.immagine) {
    document.getElementById('imgPreview').innerHTML =
      `<img src="${item.immagine}" style="width:100%;height:80px;object-fit:cover;border-radius:6px">`;
  }

  aggiornaPreview();
  cercaVarianti(item.operaId);
  showToast(`"${item.titolo}" caricato per modifica`, 'info');
}

function resetForm() {
  ['operaId','museo','titolo','descrizione','tags','immagineUrl','licenzaNote'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('lunghezza').value  = '3m';
  document.getElementById('linguaggio').value = 'intermedio';
  document.getElementById('categoria').value  = 'pittura';
  document.getElementById('profonditaContenuto').value = 'standard';
  document.getElementById('licenzaTipo').value= 'gratuito';
  document.getElementById('prezzo').value     = 0;
  document.getElementById('pubblicato').checked = false;
  document.getElementById('itemId').value     = '';
  document.getElementById('formTitolo').textContent = ' Nuovo Contenuto (Item)';
  document.getElementById('charCount').textContent  = '0';
  document.getElementById('profonditaPreview').textContent = '–';
  document.getElementById('imgPreview').innerHTML = '🖼️';
  document.getElementById('variantiList').innerHTML = '<em class="text-slate small">Inserisci un operaId per vedere le varianti</em>';
  aggiornaPreview();
}