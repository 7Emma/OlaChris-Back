const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // Votre middleware JWT

// Récupérer le profil de l'utilisateur actuel
router.get("/profile", authenticateToken, userController.getUserProfile);
// Mettre à jour le profil de l'utilisateur actuel
router.put("/profile", authenticateToken, userController.updateUserProfile);

// Routes pour les autres onglets (protégées par authentification)
router.get("/orders", authenticateToken, userController.getRecentOrders);
router.get("/favorites", authenticateToken, userController.getFavoriteProducts);

module.exports = router;
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // Votre middleware JWT

// Récupérer le profil de l'utilisateur actuel
router.get("/profile", authenticateToken, userController.getUserProfile);
// Mettre à jour le profil de l'utilisateur actuel
router.put("/profile", authenticateToken, userController.updateUserProfile);

// Routes pour les autres onglets (protégées par authentification)
router.get("/orders", authenticateToken, userController.getRecentOrders);
router.get("/favorites", authenticateToken, userController.getFavoriteProducts);


module.exports = router;
