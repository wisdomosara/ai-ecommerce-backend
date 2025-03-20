const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../../models/User");
const { isAuth } = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create new user
      user = new User({
        name,
        email,
        password,
        role: role || "customer",
      });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save user to database
      await user.save();

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      // Generate JWT
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      // Generate JWT
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   GET api/auth/google
// @desc    Auth with Google
// @access  Public
router.get("/google", (req, res) => {
  const redirectTo =
    req.query["redirect-to"] || "http://localhost:3000/dashboard";
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid email profile&state=${encodeURIComponent(
    redirectTo
  )}`;
  console.log(authUrl);
  res.redirect(authUrl);
});

// @route   GET api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get("/google/callback", async (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const code = req.query.code;
  const redirectTo = decodeURIComponent(
    req.query.state || "http://localhost:3001/dashboard"
  );
  const frontendUrl = process.env.CLIENT_URL;

  if (!code) return res.status(400).send("Authorization code not provided!");

  try {
    // 1️⃣ Exchange the authorization code for an access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code,
      }),
    });
    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // 2️⃣ Fetch user details from Google
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
    );
    const googleUser = await userResponse.json();

    console.log("Google User Info:", googleUser);

    // 3️⃣ Check if user exists in database
    let user = await User.findOne({ email: googleUser.email });

    // 4️⃣ If user doesn't exist, create a new user
    if (!user) {
      user = new User({
        googleId: googleUser.sub, // Google unique ID
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        createdAt: new Date(),
      });

      await user.save();
    }

    // 5️⃣ Generate a JWT for user authentication
    const userToken = jwt.sign(
      { id: user._id, email: user.email },
      "your_jwt_secret",
      { expiresIn: "1d" }
    );

    // 6️⃣ Redirect user to their original `redirect-to` page with JWT
    res.redirect(`${frontendUrl}${redirectTo}?token=${userToken}`);
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed!");
  }
});

// @route   GET api/auth/facebook
// @desc    Auth with Facebook
// @access  Public
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// @route   GET api/auth/facebook/callback
// @desc    Facebook auth callback
// @access  Public
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  (req, res) => {
    // Create JWT payload
    const payload = {
      user: {
        id: req.user.id,
        role: req.user.role,
      },
    };

    // Generate JWT
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
      }
    );
  }
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", isAuth, (req, res) => {
  req.logout();
  res.json({ message: "User logged out" });
});

module.exports = router;
