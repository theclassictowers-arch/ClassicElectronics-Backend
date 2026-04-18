import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  profileImage: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

AdminSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

AdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Admin', AdminSchema);
