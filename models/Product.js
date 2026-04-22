import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  subcategory: {
    type: String,
    trim: true,
    default: ''
  },
  stockStatus: {
    type: String,
    trim: true,
    default: ''
  },
  images: [{
    type: String
  }],
  pdfUrl: {
    type: String,
    trim: true,
    default: ''
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  showPrice: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);
