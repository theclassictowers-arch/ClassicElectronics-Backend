import mongoose from 'mongoose';

const SliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  highlight: {
    type: String,
    required: true,
    trim: true
  },
  bgImage: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Slider', SliderSchema);
