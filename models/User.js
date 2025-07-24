const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String }, // Rendu optionnel pour les utilisateurs Google
    phone: { type: String, trim: true },
    googleId: { type: String, unique: true, sparse: true }, // Pour les utilisateurs Google
    picture: { type: String }, // URL de l'image de profil Google
    // Ajoutez d'autres champs de profil si nécessaire pour le supermarché
    dateOfBirth: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    postalCode: {
      type: String,
      default: "",
    },
    loyaltyCard: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    memberSince: {
      type: Date,
      default: Date.now,
    },
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Hacher le mot de passe seulement s'il est modifié ET présent
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // Impossible de comparer si pas de mot de passe défini
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
