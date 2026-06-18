const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username obbligatorio"],
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, "Email obbligatoria"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password obbligatoria"],
      minlength: 8,
    },
    ruolo: {
      type: String,
      enum: ["autore", "visitatore", "admin"],
      default: "visitatore",
    },
    museo: {
      type: String,
      default: null,
    },
    acquistiEffettuati: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        dataAcquisto: { type: Date, default: Date.now },
        prezzo: Number,
      },
    ],
    visiteSalvate: [{ type: mongoose.Schema.Types.ObjectId, ref: "Visita" }],
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (this.password && this.password.startsWith("$2")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema, "utenti");
