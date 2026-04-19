const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { savePushSubscription, removePushSubscription } = require('../services/notificationService');

// Subscribe to push notifications
router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.user_id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        await savePushSubscription(userId, subscription);
        res.json({ message: 'Subscribed to notifications' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', verifyToken, async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        await removePushSubscription(endpoint);
        res.json({ message: 'Unsubscribed from notifications' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Get VAPID public key for client-side subscription
router.get('/vapid-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(500).json({ error: 'VAPID public key not configured' });
    }
    res.json({ publicKey: key });
});

module.exports = router;
