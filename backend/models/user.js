const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    // Roles as per specifications: 'admin', 'autore', 'visitatore'
    role: {
      type: String,
      enum: ["autore", "visitatore", "admin"],
      default: "visitatore",
    },
    museum: { type: String, default: null },
    purchasedItems: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        price: Number,
        purchaseDate: { type: Date, default: Date.now },
      },
    ],
    savedVisits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Visit" }],
  },
  { timestamps: true },
);

// Middleware to hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Helper to check password during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
