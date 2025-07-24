const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware CORS pour permettre les requêtes du frontend React
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Votre URL frontend
    credentials: true, // Autorise l'envoi de cookies
  })
);

// Middleware pour parser les corps de requête JSON
app.use(express.json());

// Middleware pour parser les cookies
app.use(cookieParser());

// Définition des routes
app.use("/api/auth", authRoutes); // Toutes les routes d'authentification
app.use("/api/user", userRoutes); // Toutes les routes liées au profil utilisateur

// Exemple de route protégée (vous pouvez l'intégrer dans vos propres routes si nécessaire)
const { authenticateToken } = require("./middlewares/authMiddleware");
app.get("/api/protected-resource", authenticateToken, (req, res) => {
  res.json({
    message: `Bienvenue ${
      req.user.firstName || req.user.email
    }, ceci est une ressource protégée !`,
    user: req.user,
  });
});

// Gestion des erreurs (à la fin de vos middlewares et routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Quelque chose a mal tourné !");
});

module.exports = app;
