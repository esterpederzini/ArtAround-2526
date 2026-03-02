const mongoose = require('mongoose');

const logVenditaSchema = new mongoose.Schema({
  acquirenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dataAcquisto: { type: Date, default: Date.now },
  prezzo: Number,
  tipo: { type: String, enum: ['acquisto', 'adozione'], default: 'acquisto' }
});

const itemSchema = new mongoose.Schema({
  operaId: {
    type: String,
    required: [true, 'operaId obbligatorio'],
    trim: true,
    index: true
  },
  museo: {
    type: String,
    required: [true, 'Nome museo obbligatorio'],
    trim: true,
    index: true
  },
  titolo: {
    type: String,
    required: [true, 'Titolo obbligatorio'],
    trim: true
  },
  descrizione: {
    type: String,
    required: [true, 'Descrizione obbligatoria']
  },
  autore: {
    type: String,
    required: [true, 'Autore obbligatorio'],
    trim: true
  },
  // Metadati
  lunghezza: {
    type: String,
    enum: ['3s', '15s', '30s', '1m', '3m', '5m', '10m'],
    required: true
  },
  linguaggio: {
    type: String,
    enum: ['elementare', 'intermedio', 'avanzato', 'specialistico'],
    required: true
  },
  categoria: {
    type: String,
    enum: ['pittura', 'scultura', 'architettura', 'fotografia', 'arte_moderna', 'arte_antica', 'decorativa', 'altro'],
    default: 'altro'
  },
  tags: [String],
  // Immagine di riconoscimento (URL o base64)
  immagine: {
    type: String,
    default: null
  },
  // Pubblicazione
  licenza: {
    tipo: {
      type: String,
      enum: ['gratuito', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'proprietario'],
      default: 'gratuito'
    },
    note: String
  },
  prezzo: {
    type: Number,
    default: 0,
    min: 0
  },
  pubblicato: {
    type: Boolean,
    default: false
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logVendite: [logVenditaSchema],
  // Profondità del contenuto (per stesso oggetto, diverse profondità)
  profonditaContenuto: {
    type: String,
    enum: ['superficiale', 'standard', 'approfondito', 'accademico'],
    default: 'standard'
  },
  // Collegamento ad altri item dello stesso operaId
  variantiCollegateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
}, {
  timestamps: true
});

// Indice composto per ricerche frequenti
itemSchema.index({ museo: 1, pubblicato: 1 });
itemSchema.index({ operaId: 1, linguaggio: 1 });

module.exports = mongoose.model('Item', itemSchema);