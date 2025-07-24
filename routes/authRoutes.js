const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // AuthenticateToken est un middleware

// Route d'enregistrement
router.post("/register", authController.registerUser);

// Route de connexion
router.post("/login", authController.loginUser);

// Route d'authentification Google
router.post("/google", authController.handleGoogleAuth);

// Route pour vérifier l'état d'authentification (nécessite d'être connecté)
router.get("/status", authenticateToken, authController.checkAuthStatus);

// Route de déconnexion
router.post("/logout", authController.logoutUser);

module.exports = router;
