// server/routes/orders.js (Non-Transactional Version)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Item = require('../models/Item');

router.use(auth);

// @route   POST /api/orders
router.post('/', async (req, res) => {
    const { products, totalAmount } = req.body;

    try {
        // Step 1: Validate stock and prepare inventory updates
        const updates = [];
        for (const product of products) {
            const itemInStock = await Item.findById(product.productId);

            if (!itemInStock) {
                return res.status(404).json({ message: `Product not found: ${product.name}` });
            }

            if (itemInStock.quantity < product.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${itemInStock.name}. Available: ${itemInStock.quantity}` });
            }

            updates.push({
                updateOne: {
                    filter: { _id: itemInStock._id },
                    update: { $inc: { quantity: -product.quantity } }
                }
            });
        }

        // Step 2: Apply all inventory updates at once
        await Item.bulkWrite(updates);

        // Step 3: Create the new order document
        const newOrder = new Order({
            user: req.user.id,
            products,
            totalAmount
        });
        await newOrder.save();

        res.status(201).json({ message: 'Order created successfully', order: newOrder });

    } catch (error) {
        // NOTE: There is no automatic rollback here.
        console.error("Order creation failed:", error);
        res.status(500).json({ message: 'Server error during order creation.', error: error.message });
    }
});

module.exports = router;