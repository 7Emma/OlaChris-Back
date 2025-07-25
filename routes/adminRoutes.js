const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/isAdmin");
const userController = require("../controllers/userController"); // Assurez-vous que ce chemin est correct

// Route pour obtenir tous les utilisateurs (admin seulement)
// GET /api/admin/users
router.get("/users", authenticateToken, isAdmin, userController.getAllUsers);

// Route pour créer un nouvel utilisateur avec un rôle (admin seulement)
// POST /api/admin/users
router.post(
  "/users",
  authenticateToken,
  isAdmin,
  userController.createUserByAdmin
);

// NOUVELLE ROUTE : Supprimer un utilisateur par ID (admin seulement)
// DELETE /api/admin/users/:id
router.delete(
  "/users/:id",
  authenticateToken,
  isAdmin,
  userController.deleteMyProfile
);

// Exemple : Route pour créer un produit (admin seulement)
// POST /api/admin/products
router.post("/products", authenticateToken, isAdmin, async (req, res) => {
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
    console.log(
      `[Admin API] Demande de mise à jour du statut de la commande ${orderId} à ${newStatus}`
    );
    res.status(200).json({
      message: `Statut de la commande ${orderId} mis à jour à ${newStatus} (simulé par l'admin).`,
    });
  }
);

module.exports = router;
