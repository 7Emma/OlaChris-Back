// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

// Importez les userRoutes
const userRoutes = require("./routes/userRoutes");

console.log("[ENV] Chargement des variables d'environnement...");
console.log(`[CONFIG] Port: ${process.env.PORT || 5000}`);
console.log(
  `[CONFIG] MongoDB URI: ${
    process.env.MONGO_URI
      ? "***"
      : "mongodb://localhost:27017/olaCris (par défaut)"
  }`
);
console.log(
  `[CONFIG] Google Client ID: ${
    process.env.GOOGLE_CLIENT_ID ? "***" : "Non défini"
  }`
);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/olaCris";
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID_BACKEND = process.env.GOOGLE_CLIENT_ID;

// Initialiser le client Google OAuth2
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID_BACKEND);
console.log("[GOOGLE] Client OAuth2 initialisé");

// --- Connexion à MongoDB ---
console.log("[MONGO] Tentative de connexion à MongoDB...");
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("[MONGO] Connexion réussie !"))
  .catch((err) =>
    console.error("[MONGO] Échec de la connexion :", err.message)
  );

// --- Modèle Utilisateur ---
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    phone: { type: String, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    picture: { type: String },
  },
  { timestamps: true }
);

// Middleware de hachage de mot de passe
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    console.log(`[USER] Hachage du mot de passe pour ${this.email}`);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Méthode de comparaison de mot de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    console.log(
      `[AUTH] Tentative de connexion sans mot de passe (Google ID: ${this.googleId})`
    );
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = require("./models/User");
console.log("[MONGO] Modèle 'User' prêt");

// --- Middlewares Express ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // ton frontend local
      "https://ola-chris-web.netlify.app", // ton frontend déployé
    ],
    // origin: process.env.FRONTEND_URL || "http://localhost:5173",
    // Permet les requêtes avec des cookies (authentification)
    credentials: true,
  })
);
console.log("[EXPRESS] Middlewares chargés (JSON, CORS, Cookies)");

// --- Middleware JWT ---
const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;
  console.log(
    `[JWT] Tentative d'authentification avec token: ${token ? "***" : "Aucun"}`
  );

  if (!token)
    return res
      .status(401)
      .json({ message: "Accès non autorisé : Aucun jeton fourni." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("[JWT] Erreur de vérification :", err.message);
      res.clearCookie("jwt");
      return res.status(403).json({ message: "Jeton invalide ou expiré." });
    }
    console.log(`[JWT] Utilisateur authentifié : ${user.email}`);
    req.user = user;
    next();
  });
};

// --- Fonctions utilitaires pour JWT ---
const generateTokenAndSetCookie = (res, user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  console.log(`[JWT] Token généré pour ${user.email}`);
};

// --- Routes d'authentification ---

// POST /api/auth/register - Inscription traditionnelle
app.post("/api/auth/register", async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } =
    req.body;
  console.log("[REGISTER] Nouvelle inscription:", email);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !password ||
    !confirmPassword
  ) {
    console.log("[REGISTER] Erreur: Tous les champs sont requis");
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  if (password !== confirmPassword) {
    console.log("[REGISTER] Erreur: Mots de passe ne correspondent pas");
    return res
      .status(400)
      .json({ message: "Les mots de passe ne correspondent pas." });
  }

  if (
    password.length < 8 ||
    !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)
  ) {
    console.log("[REGISTER] Erreur: Mot de passe faible");
    return res.status(400).json({
      message:
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
    });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`[REGISTER] Erreur: Email ${email} déjà utilisé`);
      return res
        .status(409)
        .json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    await newUser.save();
    console.log(`[REGISTER] Nouvel utilisateur créé: ${email}`);

    generateTokenAndSetCookie(res, newUser);

    res.status(201).json({
      message: "Inscription réussie !",
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
      },
    });
  } catch (error) {
    console.error("[REGISTER] Erreur serveur:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
});

// POST /api/auth/login - Connexion traditionnelle
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("[LOGIN] Tentative de connexion:", email);

  if (!email || !password) {
    console.log("[LOGIN] Erreur: Email et mot de passe requis");
    return res
      .status(400)
      .json({ message: "L'email et le mot de passe sont requis." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[LOGIN] Erreur: Email ${email} non trouvé`);
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    if (!user.password && user.googleId) {
      console.log(
        `[LOGIN] Erreur: Utilisateur ${email} doit utiliser Google Auth`
      );
      return res
        .status(401)
        .json({ message: "Veuillez vous connecter avec Google." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`[LOGIN] Erreur: Mot de passe incorrect pour ${email}`);
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect." });
    }

    generateTokenAndSetCookie(res, user);
    console.log(`[LOGIN] Connexion réussie pour ${email}`);

    res.status(200).json({
      message: "Connexion réussie !",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("[LOGIN] Erreur serveur:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
});

// POST /api/auth/google - Inscription/Connexion Google
app.post("/api/auth/google", async (req, res) => {
  const { id_token } = req.body;
  console.log("[GOOGLE] Tentative de connexion avec Google");

  if (!id_token) {
    console.log("[GOOGLE] Erreur: ID Token manquant");
    return res.status(400).json({ message: "ID Token Google manquant." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID_BACKEND,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    console.log(`[GOOGLE] Token validé pour ${email}`);

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        console.log(
          `[GOOGLE] Liaison du compte Google à l'utilisateur existant ${email}`
        );
        user.googleId = googleId;
        user.picture = picture;
        await user.save();
      } else if (user.googleId !== googleId) {
        console.log(
          `[GOOGLE] Conflit: Email ${email} déjà lié à un autre Google ID`
        );
        return res.status(409).json({
          message: "Cet email est déjà enregistré avec un autre compte Google.",
        });
      }
    } else {
      console.log(`[GOOGLE] Création d'un nouvel utilisateur pour ${email}`);
      user = new User({
        firstName: name.split(" ")[0] || "Utilisateur",
        lastName: name.split(" ").slice(1).join(" ") || "Google",
        email,
        googleId,
        picture,
      });
      await user.save();
    }

    generateTokenAndSetCookie(res, user);
    console.log(`[GOOGLE] Connexion réussie pour ${email}`);

    res.status(200).json({
      message: "Connexion Google réussie !",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("[GOOGLE] Erreur d'authentification:", error);
    res.status(401).json({ message: "Échec de l'authentification Google." });
  }
});

// GET /api/auth/status - Vérifier l'état de la session (protégée)
app.get("/api/auth/status", authenticateToken, (req, res) => {
  console.log(`[STATUS] Vérification de session pour ${req.user.email}`);
  res.status(200).json({
    isAuthenticated: true,
    user: req.user,
  });
});

// POST /api/auth/logout - Déconnexion
app.post("/api/auth/logout", (req, res) => {
  console.log("[LOGOUT] Déconnexion utilisateur");
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  res.status(200).json({ message: "Déconnexion réussie." });
});

// --- Exemple de route protégée ---
app.get("/api/protected-resource", authenticateToken, (req, res) => {
  console.log(`[PROTECTED] Accès autorisé pour ${req.user.email}`);
  res.json({
    message: `Bienvenue ${
      req.user.firstName || req.user.email
    }, ceci est une ressource protégée !`,
    user: req.user,
  });
});

// --- Utilisation des Routes Utilisateur ---
// Cela connecte less userRoutes au chemin de base /api/user
app.use("/api/user", userRoutes); // <--- AJOUTEZ CETTE LIGNE

// --- Démarrage du serveur ---
app.listen(PORT, () => {
  console.log(`[SERVER] Serveur démarré sur http://localhost:${PORT}`);
  console.log("[ROUTES]");
  console.log(`- POST   /api/auth/register`);
  console.log(`- POST   /api/auth/login`);
  console.log(`- POST   /api/auth/google`);
  console.log(`- GET    /api/auth/status (protégée)`);
  console.log(`- POST   /api/auth/logout`);
  console.log(`- GET    /api/protected-resource (protégée)`);
});
