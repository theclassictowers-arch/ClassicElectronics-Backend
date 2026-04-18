import mongoose from 'mongoose';

const ThemeSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark'
  },
  primaryColor: {
    type: String,
    default: '#000000'
  },
  heroText: {
    type: String,
    default: 'Welcome to our store'
  }
}, { timestamps: true });

export default mongoose.model('Theme', ThemeSchema);
