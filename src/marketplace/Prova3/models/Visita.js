const mongoose = require('mongoose');

const itemInVisitaSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  ordine: { type: Number, required: true },
  opzionale: { type: Boolean, default: false },
  notePersonali: { type: String, default: '' }
}, { _id: false });

const visitaSchema = new mongoose.Schema({
  titolo: {
    type: String,
    required: [true, 'Titolo visita obbligatorio'],
    trim: true
  },
  descrizione: {
    type: String,
    default: ''
  },
  museo: {
    type: String,
    required: [true, 'Museo obbligatorio'],
    trim: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [itemInVisitaSchema],
  pubblica: {
    type: Boolean,
    default: false
  },
  prezzo: {
    type: Number,
    default: 0,
    min: 0
  },
  licenza: {
    tipo: {
      type: String,
      enum: ['gratuito', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'proprietario'],
      default: 'gratuito'
    }
  },
  durataTotaleStimata: {
    type: Number, // in minuti
    default: 0
  },
  tags: [String],
  logAdozioni: [{
    adottanteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dataAdozione: { type: Date, default: Date.now },
    prezzo: Number
  }]
}, {
  timestamps: true
});

// Calcolo automatico durata
visitaSchema.pre('save', function(next) {
  // Placeholder: la durata viene calcolata nel controller
  next();
});

module.exports = mongoose.model('Visita', visitaSchema);