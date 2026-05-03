import mongoose from 'mongoose';

const DOCUMENT_TYPES = ['quotation', 'invoice', 'deliveryChallan'];

const DocumentItemSchema = new mongoose.Schema({
  categoryId: { type: String, trim: true, default: '' },
  productId: { type: String, trim: true, default: '' },
  productName: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  uom: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  remarks: { type: String, trim: true, default: '' },
  picture: { type: String, trim: true, default: '' },
}, { _id: false });

const SalesDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    enum: DOCUMENT_TYPES,
    required: true,
    index: true,
  },
  documentNo: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  date: {
    type: String,
    trim: true,
    default: '',
  },
  customerName: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  form: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {},
  },
  items: {
    type: [DocumentItemSchema],
    default: [],
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, { timestamps: true });

export default mongoose.model('SalesDocument', SalesDocumentSchema);
