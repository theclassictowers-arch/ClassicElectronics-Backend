import mongoose from 'mongoose';

const SliderSchema = new mongoose.Schema({
  badge: {
    type: String,
    trim: true,
    default: 'Premium Industrial Components'
  },
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
  primaryButtonText: {
    type: String,
    trim: true,
    default: 'Explore Products'
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  secondaryButtonText: {
    type: String,
    trim: true,
    default: 'Contact Sales'
  },
  secondaryLink: {
    type: String,
    trim: true,
    default: '/clientSide/contact'
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

