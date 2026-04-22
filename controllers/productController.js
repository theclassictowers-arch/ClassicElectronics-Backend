import Product from '../models/Product.js';
import Category from '../models/Category.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const normalizeSlug = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const generateUniqueSlug = async (base, excludeId = null) => {
  const baseSlug = normalizeSlug(base);
  if (!baseSlug) return '';

  let candidate = baseSlug;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await Product.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select('_id');

    if (!existing) return candidate;
    candidate = `${baseSlug}-${suffix++}`;
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '..', 'uploads'); // This will resolve to Backend/uploads

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { categorySlug, q, includeSpecs, status, limit, page } = req.query;

    const query = {};

    if (typeof status === 'string' && status.trim()) {
      query.status = status.trim();
    }

    if (typeof q === 'string' && q.trim()) {
      const term = q.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
        { 'specifications.model': { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { slug: { $regex: term, $options: 'i' } },
      ];
    }

    if (typeof categorySlug === 'string' && categorySlug.trim()) {
      const slug = categorySlug.trim().toLowerCase();

      const categories = await Category.find({
        slug: { $regex: `^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\/|$)` },
      }).select('_id');

      if (categories.length === 0) {
        return res.status(200).json([]);
      }

      query.categoryId = { $in: categories.map((c) => c._id) };
    }

    const parsedLimit = Math.min(Math.max(parseInt(String(limit ?? '0'), 10) || 0, 0), 200);
    const parsedPage = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
    const skip = parsedLimit > 0 ? (parsedPage - 1) * parsedLimit : 0;

    let mongooseQuery = Product.find(query)
      .populate('categoryId', 'name slug parent level')
      .sort({ sortOrder: 1, createdAt: -1 });

    const wantsSpecs = includeSpecs === '1' || includeSpecs === 'true' || includeSpecs === true;
    if (!wantsSpecs) {
      mongooseQuery = mongooseQuery.select('-specifications');
    }

    if (parsedLimit > 0) {
      mongooseQuery = mongooseQuery.limit(parsedLimit).skip(skip);
    }

    const products = await mongooseQuery.lean();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAdminProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'specifications.model': { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/by-slug?slug=...
// @access  Public
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.query;
    if (typeof slug !== 'string' || !slug.trim()) {
      return res.status(400).json({ message: 'Missing slug query param' });
    }

    const product = await Product.findOne({ slug: slug.trim().toLowerCase() })
      .populate('categoryId', 'name slug parent level')
      .lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug parent level')
      .lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res) => {
  const {
    name,
    code,
    categoryId,
    price,
    description,
    images,
    pdfUrl,
    stock,
    slug,
    specifications,
    status,
    category,
    subcategory,
    stockStatus,
  } = req.body;

  if (!name || !categoryId || price === undefined || price === null || !description || stock === undefined || stock === null) {
    return res.status(400).json({ message: 'Please add all required fields' });
  }

  try {
    // Validate category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({ message: 'The selected category does not exist' });
    }

    const finalSlug = await generateUniqueSlug(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ message: 'Invalid slug' });
    }

    const product = await Product.create({
      name,
      code: typeof code === 'string' ? code : undefined,
      slug: finalSlug,
      categoryId,
      price,
      description,
      category: typeof category === 'string' ? category : undefined,
      subcategory: typeof subcategory === 'string' ? subcategory : undefined,
      stockStatus: typeof stockStatus === 'string' ? stockStatus : undefined,
      images,
      pdfUrl: typeof pdfUrl === 'string' ? pdfUrl : undefined,
      stock,
      specifications: specifications ?? null,
      status: typeof status === 'string' ? status : undefined,
    });

    res.status(201).json(product);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 11000) {
      return res.status(400).json({ message: 'Slug already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reorder products
// @route   PUT /api/products/reorder
// @access  Private (Admin)
export const reorderProducts = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds array is required' });
    }

    // Bulk update using index as sortOrder
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    await Product.bulkWrite(bulkOps);

    res.status(200).json({ message: 'Products reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Cleanup replaced images from the file system
    if (req.body.images && Array.isArray(req.body.images)) {
      const oldImages = product.images || [];
      const newImages = req.body.images;
      // Woh images dhundein jo pehle thin lekin naye update mein nahi hain
      const imagesToDelete = oldImages.filter(img => !newImages.includes(img));

      for (const imagePath of imagesToDelete) {
        const filename = path.basename(imagePath);
        const fullPath = path.join(uploadsRoot, 'products', filename);
        fs.unlink(fullPath, (err) => { if (err) console.error(`Cleanup error: ${fullPath}`, err); });
      }
    }

    // Cleanup replaced PDF from the file system
    if (req.body.pdfUrl !== undefined && product.pdfUrl && req.body.pdfUrl !== product.pdfUrl) {
      const filename = path.basename(product.pdfUrl);
      const fullPath = path.join(uploadsRoot, 'pdfs', filename);
      fs.unlink(fullPath, (err) => { if (err) console.error(`Cleanup error: ${fullPath}`, err); });
    }

    const update = { ...req.body };

    if (typeof req.body.slug === 'string' && req.body.slug.trim()) {
      update.slug = await generateUniqueSlug(req.body.slug, product._id);
    } else if ((!product.slug || !String(product.slug).trim()) && (typeof req.body.name === 'string' ? req.body.name : product.name)) {
      update.slug = await generateUniqueSlug(typeof req.body.name === 'string' ? req.body.name : product.name, product._id);
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('categoryId', 'name slug parent level');

    res.status(200).json(updatedProduct);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 11000) {
      return res.status(400).json({ message: 'Slug already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated images from the file system
    if (product.images && product.images.length > 0) {
      for (const imagePath of product.images) {
        // Extract filename from the URL path (e.g., /uploads/products/filename.png -> filename.png)
        const filename = path.basename(imagePath);
        const fullPath = path.join(uploadsRoot, 'products', filename);
        fs.unlink(fullPath, (err) => {
          if (err) {
            // Agar file delete na ho sake, toh error log karein lekin product deletion ko na rokein
            console.error(`Failed to delete image file: ${fullPath}`, err);
          } else {
            console.log(`Deleted image file: ${fullPath}`);
          }
        });
      }
    }

    // Delete associated PDF from the file system
    if (product.pdfUrl) {
      const filename = path.basename(product.pdfUrl);
      const fullPath = path.join(uploadsRoot, 'pdfs', filename);
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error(`Failed to delete PDF file: ${fullPath}`, err);
        } else {
          console.log(`Deleted PDF file: ${fullPath}`);
        }
      });
    }

    await product.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Product and associated files deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
