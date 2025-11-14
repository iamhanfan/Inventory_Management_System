// server/routes/items.js
const express = require('express');
const router = express.Router();

// --- Import Middleware & Models ---
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Item = require('../models/Item');
const User = require('../models/User');
const Order = require('../models/Order');

router.use(auth);

// @route   GET /api/items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ dateAdded: -1 });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/items
router.post('/', async (req, res) => {
    try {
        const newItem = new Item({
            // Pass the entire request body, Mongoose will map the fields
            ...req.body,
            expiryDate: req.body.expiryDate || null,
        });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        console.error("Error adding item:", err.message);
        if (err.code === 11000) {
            return res.status(400).json({ message: `An item with this SKU, Barcode, or Product ID already exists.` });
        }
        res.status(400).json({ message: 'Error adding item. Please check all required fields.', error: err.message });
    }
});

// @route   DELETE /api/items/:id
router.delete('/:id', admin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.deleteOne();
    res.json({ success: true, message: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/items/report
router.get('/report', async (req, res) => {
    try {
        const reportData = await Item.aggregate([
            { $group: { _id: '$category', maxQuantity: { $max: '$quantity' }, minQuantity: { $min: '$quantity' }}},
            { $sort: { _id: 1 } }
        ]);
        res.json(reportData);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/items/stats
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }
    const [totalProducts, totalCategories, totalCustomers, totalOrders, salesData] = await Promise.all([
      Item.countDocuments(),
      Item.distinct('category').then(c => c.length),
      User.countDocuments(),
      Order.countDocuments(dateFilter),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, totalSale: { $sum: '$totalAmount' }, soldProducts: { $sum: { $sum: '$products.quantity' }}}}
      ])
    ]);
    const stats = {
      totalProducts, totalCategories, totalCustomers, totalOrders,
      todaysSale: salesData[0]?.totalSale || 0,
      soldProducts: salesData[0]?.soldProducts || 0,
      todaysProfit: (salesData[0]?.totalSale || 0) * 0.2,
    };
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;