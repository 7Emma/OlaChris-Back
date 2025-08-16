const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID_BACKEND = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID_BACKEND);

// Helper function to generate JWT and set cookie
const generateTokenAndSetCookie = (res, user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
    sameSite: "Lax",
  });
  console.log(`[JWT] Token generated for ${user.email}`);
  return token;
};

// @desc    Traditional user registration
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } =
    req.body;
  console.log("[REGISTER] New registration attempt:", email);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !password ||
    !confirmPassword
  ) {
    console.log("[REGISTER] Error: All fields are required");
    return res.status(400).json({ message: "All fields are required." });
  }

  if (password !== confirmPassword) {
    console.log("[REGISTER] Error: Passwords do not match");
    return res.status(400).json({ message: "Passwords do not match." });
  }

  if (
    password.length < 8 ||
    !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)
  ) {
    console.log("[REGISTER] Error: Weak password");
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.",
    });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`[REGISTER] Error: Email ${email} already in use`);
      return res
        .status(409)
        .json({ message: "A user with this email already exists." });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: "user",
    });

    await newUser.save();
    console.log(`[REGISTER] New user created: ${email}`);

    generateTokenAndSetCookie(res, newUser);

    res.status(201).json({
      message: "Registration successful!",
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        picture: newUser.picture,
      },
    });
  } catch (error) {
    console.error("[REGISTER] Server error:", error.message);
    console.error("[REGISTER] Error stack:", error.stack);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// @desc    Traditional user login
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log("[LOGIN] Attempting login:", email);

  if (!email || !password) {
    console.log("[LOGIN] Error: Email and password required");
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[LOGIN] Error: Email ${email} not found`);
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    if (!user.password && user.googleId) {
      console.log(`[LOGIN] Error: User ${email} must use Google Auth`);
      return res.status(401).json({ message: "Please log in with Google." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`[LOGIN] Error: Incorrect password for ${email}`);
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = generateTokenAndSetCookie(res, user);
    console.log(`[LOGIN] Login successful for ${email}`);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[LOGIN] Server error:", error.message);
    console.error("[LOGIN] Error stack:", error.stack);
    res.status(500).json({ message: "Server error during login." });
  }
};

// @desc    Google registration/login
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  const { id_token } = req.body;
  console.log("[GOOGLE] Attempting Google login");

  if (!id_token) {
    console.log("[GOOGLE] Error: Missing ID Token");
    return res.status(400).json({ message: "Missing Google ID Token." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID_BACKEND,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    console.log(`[GOOGLE] Token validated for ${email}`);

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        console.log(
          `[GOOGLE] Linking Google account to existing user ${email}`
        );
        user.googleId = googleId;
        user.picture = picture;
        await user.save();
      } else if (user.googleId !== googleId) {
        console.log(
          `[GOOGLE] Conflict: Email ${email} already linked to another Google ID`
        );
        return res.status(409).json({
          message:
            "This email is already registered with another Google account.",
        });
      }
    } else {
      console.log(`[GOOGLE] Creating new user for ${email}`);
      user = new User({
        firstName: name.split(" ")[0] || "User",
        lastName: name.split(" ").slice(1).join(" ") || "Google",
        email,
        googleId,
        picture,
        role: "user",
      });
      await user.save();
    }

    generateTokenAndSetCookie(res, user);
    console.log(`[GOOGLE] Login successful for ${email}`);

    res.status(200).json({
      message: "Google login successful!",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[GOOGLE] Authentication error:", error);
    res.status(401).json({ message: "Google authentication failed." });
  }
};

// @desc    Get session status
// @route   GET /api/auth/status
// @access  Private (requires authenticateToken middleware)
exports.getAuthStatus = async (req, res) => {
  console.log(`[STATUS] Session check for ${req.user.email}`);
  res.status(200).json({
    isAuthenticated: true,
    user: req.user,
  });
};

// @desc    User logout
// @route   POST /api/auth/logout
// @access  Public
exports.logoutUser = async (req, res) => {
  console.log("[LOGOUT] User logout");
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });
  res.status(200).json({ message: "Logout successful." });
};
