const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const notificationService = require("../services/notificationService");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const items = await notificationService.listForUser(req.user.UserId, {
      category: req.query.category,
      unreadOnly: req.query.unread === "true",
    });
    const unread = await notificationService.unreadCount(req.user.UserId);
    res.json({ items, unread });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const unread = await notificationService.unreadCount(req.user.UserId);
    res.json({ unread });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/read-all", async (req, res) => {
  try {
    const count = await notificationService.markAllRead(req.user.UserId);
    res.json({ message: "All notifications marked as read", count });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.delete("/clear-read", async (req, res) => {
  try {
    const count = await notificationService.clearRead(req.user.UserId);
    res.json({ message: "Cleared read notifications", count });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    const item = await notificationService.markRead(req.user.UserId, req.params.id);
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json(item);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
