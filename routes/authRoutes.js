const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController"); // Ensure this path is correct
const { authenticateToken } = require("../middlewares/authMiddleware"); // Import authenticateToken

// POST /api/auth/register - Traditional registration
router.post("/register", authController.registerUser);

// POST /api/auth/login - Traditional login
router.post("/login", authController.loginUser);

// POST /api/auth/google - Google registration/login
router.post("/google", authController.googleAuth);

// GET /api/auth/status - Check session status (protected)
router.get("/status", authenticateToken, authController.getAuthStatus);

// POST /api/auth/logout - Logout
router.post("/logout", authController.logoutUser);

module.exports = router;
