import express from "express";
import Subscription from "../models/subscription.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // prevent duplicate subscription
    const exists = await Subscription.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(200).json({ message: "Already subscribed" });
    }

    await Subscription.create({ email: cleanEmail });

    return res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("Subscription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
