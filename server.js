// server.js (Exemple simple)
const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors"); // Pour gérer les requêtes du frontend
require("dotenv").config(); // Pour charger les variables d'environnement

const app = express();
const PORT = process.env.PORT || 5000;

// Votre Client ID Google pour le backend (différent de celui du frontend si vous avez des types d'applications différents)
// Pour une application web, c'est souvent le même.
const GOOGLE_CLIENT_ID_BACKEND = process.env.GOOGLE_CLIENT_ID;

// Assurez-vous d'utiliser une clé secrète forte pour vos JWT
const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_jwt_key_please_change";

const client = new OAuth2Client(GOOGLE_CLIENT_ID_BACKEND);

// Middleware
app.use(express.json()); // Pour parser les corps de requêtes JSON
app.use(cookieParser()); // Pour parser les cookies
app.use(
  cors({
    origin: "http://localhost:5173", // Remplacez par l'URL de votre frontend React
    credentials: true, // Autorise l'envoi de cookies et d'en-têtes d'autorisation
  })
);

// --- Middleware d'authentification JWT ---
const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt; // Récupère le JWT du cookie

  if (!token)
    return res
      .status(401)
      .json({ message: "Accès non autorisé : Aucun jeton fourni." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Si le jeton est invalide ou expiré, efface le cookie et retourne une erreur
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
      });
      return res.status(403).json({ message: "Jeton invalide ou expiré." });
    }
    req.user = user; // Stocke les données de l'utilisateur décodées dans req.user
    next();
  });
};

// --- Routes d'authentification ---

// Route pour la connexion Google
app.post("/api/auth/google", async (req, res) => {
  const { id_token } = req.body; // L'ID Token envoyé par le frontend

  if (!id_token) {
    return res.status(400).json({ message: "ID Token manquant." });
  }

  try {
    // 1. Vérifier l'ID Token avec Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID_BACKEND, // Vérifie que le jeton est pour votre app
    });
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // 2. Chercher ou créer l'utilisateur dans votre base de données
    // REMPLACEZ CECI PAR VOTRE LOGIQUE DE BASE DE DONNÉES
    let user = { googleId: sub, email, name, picture }; // Exemple d'objet utilisateur
    // Ex: const userInDb = await User.findOne({ googleId: sub });
    // if (!userInDb) { userInDb = await User.create(user); }
    // user = userInDb;
    // FIN LOGIQUE DE BASE DE DONNÉES

    // 3. Générer un JWT (JSON Web Token) pour la session
    const token = jwt.sign(
      {
        id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
      }, // Données à inclure dans le JWT
      JWT_SECRET,
      { expiresIn: "1h" } // Le JWT expire après 1 heure (adaptez)
    );

    // 4. Envoyer le JWT dans un cookie HTTP Only
    res.cookie("jwt", token, {
      httpOnly: true, // Non accessible via JavaScript côté client
      secure: process.env.NODE_ENV === "production", // N'envoyer que sur HTTPS en production
      maxAge: 3600000, // 1 heure en millisecondes (doit correspondre à expiresIn du JWT)
      sameSite: "Lax", // Protection CSRF
    });

    res.status(200).json({
      message: "Connexion réussie",
      user: {
        id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
      }, // Envoyer des infos utilisateur non sensibles
    });
  } catch (error) {
    console.error("Erreur d'authentification Google:", error);
    res.status(401).json({ message: "Échec de l'authentification Google." });
  }
});

// Route pour vérifier l'état de la session (protégée par le middleware)
app.get("/api/auth/status", authenticateToken, (req, res) => {
  // Si nous arrivons ici, le jeton est valide, et req.user contient les données du JWT
  res.status(200).json({
    isAuthenticated: true,
    user: req.user, // Contient id, email, name, picture de votre JWT
  });
});

// Route de déconnexion
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });
  res.status(200).json({ message: "Déconnexion réussie." });
});

// --- Exemple de route protégée ---
app.get("/api/protected-resource", authenticateToken, (req, res) => {
  res.json({
    message: `Bienvenue ${
      req.user.name || req.user.email
    }, ceci est une ressource protégée !`,
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
});
