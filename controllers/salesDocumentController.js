import SalesDocument from '../models/SalesDocument.js';

const allowedDocumentTypes = ['quotation', 'invoice', 'deliveryChallan'];

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

export const getSalesDocuments = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { documentType: type } : {};

    const documents = await SalesDocument.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
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
    const document = await SalesDocument.create(buildDocumentPayload(req.body, req.admin?._id));
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
