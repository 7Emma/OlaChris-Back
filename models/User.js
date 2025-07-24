const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    phone: { type: String, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    picture: { type: String },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    loyaltyCard: { type: String, unique: true, sparse: true, default: null },
    memberSince: { type: Date, default: Date.now },
    points: { type: Number, default: 0 },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
    favorites: [{ type: Number }], // Remis à 'Number' pour les IDs de produits
    // NOUVEAU CHAMP : Rôle de l'utilisateur
    role: {
      type: String,
      enum: ["user", "admin"], // Les rôles possibles
      default: "user", // Rôle par défaut pour les nouveaux utilisateurs
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Utilise mongoose.models pour éviter l'erreur OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
