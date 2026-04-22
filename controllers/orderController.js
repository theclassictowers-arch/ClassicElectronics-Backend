import Order from '../models/Order.js';

const generateOrderId = () => {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CE-${yyyymmdd}-${rand}`;
};

const normalizeItem = (item) => {
  const quantity = Number(item?.quantity ?? item?.qty ?? 1);
  const price = Number(item?.price ?? 0);

  return {
    productId: item?.productId ?? item?._id ?? null,
    productName: String(item?.productName ?? item?.name ?? ''),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
  };
};

// @desc    Create order
// @route   POST /api/orders
// @access  Public
export const createOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    const normalizedItems = items.map(normalizeItem);
    const totalAmount = normalizedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    const order = await Order.create({
      orderId: generateOrderId(),
      customerName: typeof customerName === 'string' ? customerName : '',
      customerEmail: typeof customerEmail === 'string' ? customerEmail : '',
      customerPhone: typeof customerPhone === 'string' ? customerPhone : '',
      items: normalizedItems,
      totalAmount,
      notes: typeof notes === 'string' ? notes : '',
      status: 'pending',
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private (Admin)
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

    if (typeof status !== 'string' || !allowed.has(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      message: 'Order updated successfully',
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
