const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    workId: { type: String, required: true, index: true }, // Universal ID (e.g., Q126599960) [cite: 259, 276]
    title: { type: String, required: true },
    description: { type: String, required: true }, // Text for speech synthesis [cite: 227, 265]
    museum: { type: String, required: true, index: true },
    author: { type: String, required: true }, // The artist of the work [cite: 268, 276]

    // MANDATORY METADATA [cite: 266, 267]
    duration: {
      type: String,
      enum: ["3s", "15s", "1min", "4min"],
      required: true,
    },
    language: {
      type: String,
      enum: ["infantile", "elementare", "medio", "specialistico"],
      required: true,
    },

    image: { type: String }, // Recognition image [cite: 228, 265]
    price: { type: Number, default: 0 }, // For marketplace [cite: 261]
    license: {
      type: { type: String, default: "gratuito" }, // [cite: 261, 269]
    },
    isPublished: { type: Boolean, default: false },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Marketplace sales tracking [cite: 261]
    salesLog: [
      {
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
        price: Number,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Item", itemSchema);
