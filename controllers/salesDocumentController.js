import SalesDocument from '../models/SalesDocument.js';

import Customer from '../models/Customer.js';

const allowedDocumentTypes = ['quotation', 'invoice', 'deliveryChallan', 'bill'];
const autoIncrementFormFieldsByType = {
  quotation: ['invoiceNo', 'purchaseOrder', 'quotationNo'],
  invoice: ['invoiceNo', 'purchaseOrder', 'quotationNo'],
  deliveryChallan: ['invoiceNo', 'purchaseOrder', 'gst'],
  bill: ['invoiceNo', 'purchaseOrder', 'quotationNo'],
};

const getNextSequenceValue = (value) => {
  const textValue = String(value || '').trim();
  if (!textValue) return '';

  const matches = [...textValue.matchAll(/\d+/g)];
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return textValue;

  const numericText = lastMatch[0];
  const nextNumber = String(Number(numericText) + 1).padStart(numericText.length, '0');
  const startIndex = lastMatch.index;

  return `${textValue.slice(0, startIndex)}${nextNumber}${textValue.slice(startIndex + numericText.length)}`;
};

const buildNextFormValues = async (documentType, form) => {
  const nextForm = { ...form };
  const latestDocument = await SalesDocument.findOne({ documentType })
    .sort({ createdAt: -1, _id: -1 })
    .select('form')
    .lean();

  if (!latestDocument?.form || typeof latestDocument.form !== 'object') {
    return nextForm;
  }

  const autoIncrementFormFields = autoIncrementFormFieldsByType[documentType] || [];

  autoIncrementFormFields.forEach((field) => {
    const previousValue = latestDocument.form[field];
    const nextValue = getNextSequenceValue(previousValue);

    if (nextValue) {
      nextForm[field] = nextValue;
    }
  });

  return nextForm;
};

const buildDocumentPayload = (body, adminId) => {
  const { documentType, form = {}, items = [], totalAmount = 0 } = body;

  return {
    documentType,
    documentNo: form.invoiceNo || '',
    date: form.date || '',
    customerName: form.companyName || '',
    form,
    items: Array.isArray(items) ? items : [],
    totalAmount: Number(totalAmount || 0),
    createdBy: adminId,
  };
};

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const syncCustomerFromForm = async (form, adminId) => {
  if (!form || typeof form !== 'object') return;

  const name = cleanString(form.companyName);
  const location = cleanString(form.location);
  if (!name) return;

  await Customer.findOneAndUpdate(
    { normalizedName: name.toLowerCase(), normalizedLocation: location.toLowerCase() },
    {
      $set: {
        name,
        location,
        gst: cleanString(form.gst),
        ntn: cleanString(form.ntn),
        email: cleanString(form.customerEmail ?? form.email),
        phonePrimary: cleanString(form.customerPhone ?? form.phonePrimary),
        phoneSecondary: cleanString(form.phoneSecondary),
      },
      $setOnInsert: {
        createdBy: adminId,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

export const getSalesDocuments = async (req, res) => {
  try {
    const { type, q, limit, sortBy, order } = req.query;
    const filter = {};

    if (type) {
      if (!allowedDocumentTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }
      filter.documentType = type;
    }

    if (typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim();
      filter.$or = [
        { documentNo: { $regex: searchTerm, $options: 'i' } },
        { customerName: { $regex: searchTerm, $options: 'i' } },
        { date: { $regex: searchTerm, $options: 'i' } },
        { 'form.purchaseOrder': { $regex: searchTerm, $options: 'i' } },
        { 'form.quotationNo': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const parsedLimit = Math.min(Math.max(parseInt(String(limit ?? '100'), 10) || 100, 1), 300);
    const sortDirection = order === 'asc' ? 1 : -1;
    const sortField =
      ['documentNo', 'customerName', 'date', 'totalAmount', 'createdAt'].includes(sortBy)
        ? sortBy
        : 'createdAt';

    const documents = await SalesDocument.find(filter)
      .sort({ [sortField]: sortDirection, _id: sortDirection })
      .limit(parsedLimit)
      .lean();

    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalesDocument = async (req, res) => {
  try {
    const document = await SalesDocument.findById(req.params.id).lean();

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSalesDocument = async (req, res) => {
  const { documentType, form } = req.body;

  if (!allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }

  if (!form || typeof form !== 'object') {
    return res.status(400).json({ message: 'Document form data is required' });
  }

  try {
    const formWithNextNumbers = await buildNextFormValues(documentType, form);
    const document = await SalesDocument.create(
      buildDocumentPayload(
        {
          ...req.body,
          form: formWithNextNumbers,
        },
        req.admin?._id
      )
    );
    await syncCustomerFromForm(formWithNextNumbers, req.admin?._id);

    res.status(201).json(document);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSalesDocument = async (req, res) => {
  const { documentType, form } = req.body;

  if (documentType && !allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }

  if (!form || typeof form !== 'object') {
    return res.status(400).json({ message: 'Document form data is required' });
  }

  try {
    const document = await SalesDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const updatedDocument = await SalesDocument.findByIdAndUpdate(
      req.params.id,
      buildDocumentPayload(req.body, document.createdBy || req.admin?._id),
      { new: true, runValidators: true }
    );
    await syncCustomerFromForm(form, document.createdBy || req.admin?._id);

    res.status(200).json(updatedDocument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteSalesDocument = async (req, res) => {
  try {
    const document = await SalesDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await document.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
