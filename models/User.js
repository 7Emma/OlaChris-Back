const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Définir la chaîne Base64 de l'avatar par défaut
const DEFAULT_AVATAR_BASE64 = "https://images.app.goo.gl/A1NpAWx21hhC1bdYA";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, trim: true, default: null },
    password: { type: String, select: false }, // Ne pas renvoyer le mot de passe par défaut
    googleId: { type: String, unique: true, sparse: true, select: false }, // 'sparse' permet plusieurs null
    role: { type: String, enum: ["user", "admin"], default: "user" },
    picture: { type: String, default: DEFAULT_AVATAR_BASE64 }, // Ajout du champ 'picture' avec valeur par défaut
    loyaltyCard: { type: String, unique: true, sparse: true, default: null }, // Assurez-vous que sparse: true est ici
    memberSince: { type: Date, default: Date.now },
    points: { type: Number, default: 0 },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
    favorites: { type: [Number], default: [] }, // Tableau de IDs de produits favoris
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  }
);

// Middleware Mongoose pour hacher le mot de passe avant de sauvegarder
userSchema.pre("save", async function (next) {
  // Ne hache le mot de passe que s'il est modifié ou nouveau ET s'il n'y a pas de googleId
  if (
    (this.isModified("password") || this.isNew) &&
    this.password &&
    !this.googleId
  ) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Retourne false si le champ password est vide (ex: utilisateur Google)
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// userSchema.index({ loyaltyCard: 1 }, { unique: true, sparse: true }); // Cette ligne est supprimée car redondante

module.exports = mongoose.model("User", userSchema);
