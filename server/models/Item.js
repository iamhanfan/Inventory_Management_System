// server/models/Item.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemSchema = new Schema({
    // 🏷️ Basic Product Info
    productId: { type: String, unique: true, required: true, default: () => `PROD-${Date.now()}` },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },

    // 📦 Inventory & Pricing
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'pieces' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    currency: { type: String, default: 'USD' },
    stockStatus: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'In Stock' },

    // 🕓 Date & Time
    dateAdded: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    expiryDate: { type: Date },

    // 🌍 Supplier & Location
    supplier: {
        name: { type: String, trim: true },
        contact: { type: String, trim: true }
    },
    warehouseLocation: { type: String, trim: true },
    sku: { type: String, trim: true, unique: true, sparse: true },

    // ⭐ Customer & Review
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    tags: [String],

    // ⚙️ Other Useful Fields
    weight: { value: Number, unit: { type: String, default: 'kg' } },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, default: 'cm' }
    },
    color: { type: String, trim: true },
    material: { type: String, trim: true },
    barcode: { type: String, trim: true, unique: true, sparse: true },
    warranty: { type: String, default: 'No Warranty' },
    returnPolicy: { type: String, default: 'No Returns' }
});

ItemSchema.pre('save', function (next) {
    if (this.isModified('quantity')) {
        if (this.quantity <= 0) {
            this.stockStatus = 'Out of Stock';
        } else if (this.quantity < 10) {
            this.stockStatus = 'Low Stock';
        } else {
            this.stockStatus = 'In Stock';
        }
    }
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('Item', ItemSchema);