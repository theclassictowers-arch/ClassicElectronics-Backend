import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    normalizedLocation: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    gst: {
      type: String,
      trim: true,
      default: '',
    },
    ntn: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phonePrimary: {
      type: String,
      trim: true,
      default: '',
    },
    phoneSecondary: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

CustomerSchema.index({ normalizedName: 1, normalizedLocation: 1 }, { unique: true });

CustomerSchema.pre('validate', function setNormalizedCustomerFields(next) {
  if (this.name) {
    this.normalizedName = String(this.name).trim().toLowerCase();
  }
  this.normalizedLocation = String(this.location || '').trim().toLowerCase();
  next();
});

export default mongoose.model('Customer', CustomerSchema);
