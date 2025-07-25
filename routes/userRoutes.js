const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const userController = require("../controllers/userController");

// Route pour l'enregistrement d'un nouvel utilisateur
router.post("/logout", authenticateToken, userController.logoutUser); // Route pour déconnexion
// Route pour récupérer le profil de l'utilisateur connecté
router.get("/profile", authenticateToken, userController.getUserProfile);

// Route pour mettre à jour le profil de l'utilisateur connecté
router.put("/profile", authenticateToken, userController.updateUserProfile);

// Route pour supprimer le profil de l'utilisateur connecté
router.delete("/profile", authenticateToken, userController.deleteMyProfile);

// Route pour récupérer les commandes récentes de l'utilisateur (simulé)
router.get("/orders", authenticateToken, userController.getRecentOrders);

// Route pour récupérer les IDs des produits favoris de l'utilisateur
router.get("/favorites", authenticateToken, userController.getFavoriteProducts);

// Route pour ajouter ou retirer un produit des favoris de l'utilisateur
router.post(
  "/favorites/toggle/:productId",
  authenticateToken,
  userController.toggleFavoriteProduct
);

module.exports = router;
