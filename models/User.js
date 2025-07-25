const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Définir la chaîne Base64 de l'avatar par défaut
const DEFAULT_AVATAR_BASE64 =
  "data:image/png;base64,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";

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
    picture: { type: String, default: DEFAULT_AVATAR_BASE64 }, // Ajoutez le champ 'picture' avec valeur par défaut
    loyaltyCard: { type: String, unique: true, sparse: true, default: null },
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

module.exports = mongoose.model("User", userSchema);
