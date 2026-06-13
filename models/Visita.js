const mongoose = require("mongoose");

const tappaSchema = new mongoose.Schema(
  {
    ordine: Number,
    logistica: String,
    item_default: {
      type: String,
      ref: "Item",
    },
    varianti_difficolta: {
      infantile: String,
      medio: String,
      avanzato: String,
    },
  },
  { _id: false },
);

const visitaSchema = new mongoose.Schema(
  {
    titolo: { type: String },
    title: { type: String },
    museo: { type: String },
    image: { type: String },
    type: { type: String },
    duration: { type: String },
    stops: { type: Number },
    livello_base: { type: String },
    info_generale: { type: String },
    tappe: [tappaSchema],
    descrizione: { type: String },
    prezzo: { type: Number, default: 0 },
    pubblica: { type: Boolean, default: false },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    licenza: {
      tipo: { type: String, default: "gratuito" },
      note: { type: String, default: "" },
    },
    logAdozioni: [
      {
        adottanteId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        dataAdozione: { type: Date, default: Date.now },
        prezzo: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true, strict: false, strictPopulate: false },
);

module.exports = mongoose.model("Visita", visitaSchema, "visits");
