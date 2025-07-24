const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware"); // Votre middleware d'authentification
const isAdmin = require("../middlewares/isAdmin"); // Votre nouveau middleware d'autorisation
const User = require("../models/User"); // Importez le modèle User pour la gestion des utilisateurs
// Vous importerez d'autres contrôleurs ici pour la gestion des produits, commandes, etc.

// Exemple : Route pour obtenir tous les utilisateurs (admin seulement)
// GET /api/admin/users
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Récupère tous les utilisateurs sauf les mots de passe et les Google IDs sensibles
    const users = await User.find({}).select("-password -googleId");
    res.json(users);
  } catch (error) {
    console.error(
      "Erreur backend lors de la récupération des utilisateurs (admin):",
      error
    );
    res
      .status(500)
      .json({
        message: "Erreur serveur lors de la récupération des utilisateurs.",
      });
  }
});

// Exemple : Route pour créer un produit (admin seulement)
// POST /api/admin/products
router.post("/products", authenticateToken, isAdmin, async (req, res) => {
  // Ici, vous implémenteriez la logique pour créer un nouveau produit dans la base de données
  // const { name, description, price, ... } = req.body;
  console.log("[Admin API] Demande de création de produit reçue:", req.body);
  res
    .status(201)
    .json({ message: "Produit créé avec succès (simulé par l'admin)." });
});

// Exemple : Route pour mettre à jour le statut d'une commande (admin seulement)
// PUT /api/admin/orders/:orderId/status
router.put(
  "/orders/:orderId/status",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    // Ici, vous implémenteriez la logique pour mettre à jour le statut de la commande
    console.log(
      `[Admin API] Demande de mise à jour du statut de la commande ${orderId} à ${newStatus}`
    );
    res
      .status(200)
      .json({
        message: `Statut de la commande ${orderId} mis à jour à ${newStatus} (simulé par l'admin).`,
      });
  }
);

module.exports = router;
