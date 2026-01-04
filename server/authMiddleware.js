const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    // Get token from headers
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access Denied: No Token" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT_SECRET should be your secret key
    req.user = decoded; // attach decoded payload to request
    next(); // proceed to route
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
