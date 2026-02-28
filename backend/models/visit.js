const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    museum: { type: String, required: true },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // VISIT STRUCTURE [cite: 264]
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        order: { type: Number, required: true },
        isOptional: { type: Boolean, default: false }, // For time-constrained visits [cite: 258]

        // MANDATORY CONSTRAINT: Logistic instructions are NOT items [cite: 273]
        // Example: "Turn left after the statue towards room 12" [cite: 264]
        navigationInstruction: { type: String, default: "" },
      },
    ],

    isPublic: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 60 }, // in minutes [cite: 217]

    // Adoption tracking for marketplace [cite: 261]
    adoptionsLog: [
      {
        adopterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Visit", visitSchema);
