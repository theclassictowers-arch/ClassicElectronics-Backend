import Customer from '../models/Customer.js';

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeMatchValue = (value) => cleanString(value).toLowerCase();
let customerIndexReadyPromise = null;

const getDuplicateMessage = (error) => {
  if (error && typeof error === 'object' && error.code === 11000) {
    return 'Customer already exists';
  }
  return null;
};

const buildCustomerPayload = (body, adminId) => {
  const name = cleanString(body.name ?? body.companyName);
  const location = cleanString(body.location ?? body.address);

  return {
    name,
    normalizedName: normalizeMatchValue(name),
    normalizedLocation: normalizeMatchValue(location),
    location,
    gst: cleanString(body.gst),
    ntn: cleanString(body.ntn),
    email: cleanString(body.email),
    phonePrimary: cleanString(body.phonePrimary ?? body.phone),
    phoneSecondary: cleanString(body.phoneSecondary),
    contactPerson: cleanString(body.contactPerson ?? body.attention),
    notes: cleanString(body.notes),
    status: cleanString(body.status) || 'active',
    createdBy: adminId,
  };
};

const ensureCustomerIndexReady = async () => {
  if (customerIndexReadyPromise) {
    return customerIndexReadyPromise;
  }

  customerIndexReadyPromise = (async () => {
    const indexes = await Customer.collection.indexes();
    const oldNameOnlyIndex = indexes.find(
      (index) =>
        index.name === 'normalizedName_1' &&
        index.unique === true &&
        Object.keys(index.key || {}).length === 1
    );

    if (oldNameOnlyIndex) {
      await Customer.collection.dropIndex(oldNameOnlyIndex.name);
    }

    const customersToNormalize = await Customer.find({
      $or: [
        { normalizedName: { $exists: false } },
        { normalizedName: '' },
        { normalizedLocation: { $exists: false } },
      ],
    })
      .select('_id name location')
      .lean();

    if (customersToNormalize.length > 0) {
      await Customer.bulkWrite(
        customersToNormalize.map((customer) => ({
          updateOne: {
            filter: { _id: customer._id },
            update: {
              $set: {
                normalizedName: normalizeMatchValue(customer.name),
                normalizedLocation: normalizeMatchValue(customer.location),
              },
            },
          },
        }))
      );
    }

    try {
      await Customer.collection.createIndex(
        { normalizedName: 1, normalizedLocation: 1 },
        { unique: true }
      );
    } catch (error) {
      if (error?.code !== 11000 && error?.code !== 85) {
        throw error;
      }
      console.warn('Customer unique index skipped because it already exists or duplicate customer/location pairs exist.');
    }
  })().catch((error) => {
    customerIndexReadyPromise = null;
    throw error;
  });

  return customerIndexReadyPromise;
};

// @desc    Get customers for admin dropdown/search
// @route   GET /api/customers
// @access  Private (Admin)
export const getCustomers = async (req, res) => {
  try {
    await ensureCustomerIndexReady();
    const { q, status, limit } = req.query;
    const filter = {};

    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    if (typeof q === 'string' && q.trim()) {
      const term = q.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
        { gst: { $regex: term, $options: 'i' } },
        { ntn: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phonePrimary: { $regex: term, $options: 'i' } },
        { phoneSecondary: { $regex: term, $options: 'i' } },
      ];
    }

    const parsedLimit = Math.min(Math.max(parseInt(String(limit ?? '300'), 10) || 300, 1), 500);
    const customers = await Customer.find(filter)
      .sort({ name: 1, createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private (Admin)
export const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private (Admin)
export const createCustomer = async (req, res) => {
  try {
    await ensureCustomerIndexReady();
    const payload = buildCustomerPayload(req.body, req.admin?._id);

    if (!payload.name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const existingCustomer = await Customer.findOne({
      normalizedName: payload.normalizedName,
      normalizedLocation: payload.normalizedLocation,
    });

    if (existingCustomer) {
      return res.status(200).json(existingCustomer);
    }

    const customer = await Customer.create(payload);
    res.status(201).json(customer);
  } catch (error) {
    const duplicateMessage = getDuplicateMessage(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: 'Customer already exists for this location' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin)
export const updateCustomer = async (req, res) => {
  try {
    await ensureCustomerIndexReady();
    const payload = buildCustomerPayload(req.body, req.admin?._id);

    if (!payload.name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    delete payload.createdBy;

    const duplicateCustomer = await Customer.findOne({
      _id: { $ne: req.params.id },
      normalizedName: payload.normalizedName,
      normalizedLocation: payload.normalizedLocation,
    }).select('_id');

    if (duplicateCustomer) {
      return res.status(400).json({ message: 'Customer already exists for this location' });
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json(customer);
  } catch (error) {
    const duplicateMessage = getDuplicateMessage(error);
    if (duplicateMessage) {
      return res.status(409).json({ message: 'Customer already exists for this location' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin)
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
