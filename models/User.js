const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define the default avatar URL
// I've replaced the Google Images URL with a valid placeholder URL.
const DEFAULT_AVATAR_URL = "https://images.app.goo.gl/A1NpAWx21hhC1bdYA";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, trim: true, default: null },
    password: { type: String, select: false }, // Do not return the password by default
    googleId: { type: String, unique: true, sparse: true, select: false }, // 'sparse' allows multiple null values
    role: { type: String, enum: ["user", "admin"], default: "user" },
    picture: { type: String, default: DEFAULT_AVATAR_URL }, // Add 'picture' field with default value
    loyaltyCard: { type: String, unique: true, sparse: true }, // Ensure sparse: true is here
    memberSince: { type: Date, default: Date.now },
    points: { type: Number, default: 0 },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
    favorites: { type: [Number], default: [] }, // Array of favorite product IDs
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Mongoose middleware to hash the password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified or new AND if there's no googleId
  if (
    (this.isModified("password") || this.isNew) &&
    this.password &&
    !this.googleId
  ) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Return false if the password field is empty (e.g., Google user)
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// userSchema.index({ loyaltyCard: 1 }, { unique: true, sparse: true }); // This line is removed as redundant

module.exports = mongoose.model("User", userSchema);
