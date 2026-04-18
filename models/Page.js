import mongoose from 'mongoose';

const PageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.model('Page', PageSchema);
