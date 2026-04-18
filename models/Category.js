import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null, // null for parent categories
    index: true
  },
  level: {
    type: Number,
    default: 1, // 1 for main categories, 2 for subcategories
    enum: [1, 2, 3]
  },
  order: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  showInNavbar: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Category', CategorySchema);
