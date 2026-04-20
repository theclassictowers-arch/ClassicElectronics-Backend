import Category from '../models/Category.js';
import Product from '../models/Product.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' })
      .sort({ order: 1, name: 1 })
      .lean();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get categories as a tree (active + navbar-ready)
// @route   GET /api/categories/tree
// @access  Public
export const getCategoriesTree = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' })
      .sort({ level: 1, order: 1, name: 1 })
      .lean();

    const nodes = new Map();
    categories.forEach((c) => {
      nodes.set(String(c._id), { ...c, children: [] });
    });

    const roots = [];
    nodes.forEach((node) => {
      if (node.parent) {
        const parent = nodes.get(String(node.parent));
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });

    res.status(200).json(roots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get navbar-ready category structure — fully dynamic
// @route   GET /api/categories/nav
// @access  Public
//
// Returns { menus: [ { _id, name, slug, children: [ { _id, name, slug, items: [...] } ] } ] }
// Every Level 1 root with showInNavbar becomes a top-level menu.
// Level 2 children appear as dropdown items.
// Level 3 children (or products in leaf categories) appear as sub-items.
export const getNavbarData = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active', showInNavbar: true })
      .sort({ level: 1, order: 1, name: 1 })
      .lean();

    // Build tree
    const byId = new Map();
    categories.forEach((c) => {
      byId.set(String(c._id), { ...c, children: [] });
    });

    const roots = [];
    byId.forEach((node) => {
      if (node.parent) {
        const parent = byId.get(String(node.parent));
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });

    // Collect all leaf category IDs (no children) to fetch their products
    const leafIds = [];
    const collectLeaves = (nodes) => {
      for (const node of nodes) {
        if (node.children.length === 0) {
          leafIds.push(node._id);
        } else {
          collectLeaves(node.children);
        }
      }
    };
    collectLeaves(roots);

    // Fetch products belonging to leaf categories
    const products = leafIds.length
      ? await Product.find({ status: 'active', categoryId: { $in: leafIds } })
          .select('_id name slug categoryId code specifications')
          .sort({ name: 1 })
          .lean()
      : [];

    const productsByCategory = new Map();
    products.forEach((p) => {
      const key = String(p.categoryId);
      const list = productsByCategory.get(key) ?? [];
      // specifications.model ko check karein, agar na ho toh code field check karein
      const modelCode = p.specifications?.model || p.code || "";
      list.push({ _id: p._id, name: p.name, slug: p.slug, code: modelCode });
      productsByCategory.set(key, list);
    });

    // Recursively format tree for output
    const formatNode = (node) => {
      if (node.children.length === 0) {
        // Leaf — attach products as items
        return {
          _id: node._id,
          name: node.name,
          slug: node.slug,
          items: productsByCategory.get(String(node._id)) ?? [],
        };
      }
      return {
        _id: node._id,
        name: node.name,
        slug: node.slug,
        children: node.children.map(formatNode),
      };
    };

    const menus = roots.map(formatNode);

    res.status(200).json({ menus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all categories (Admin)
// @route   GET /api/categories/admin
// @access  Private
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({ level: 1, order: 1, name: 1 })
      .lean();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
export const createCategory = async (req, res) => {
  const { name, slug, parent, level, order, status, showInNavbar } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ message: 'Please add all fields' });
  }

  try {
    const payload = {
      name,
      slug,
    };

    if (typeof parent === 'string' && parent.trim()) {
      payload.parent = parent.trim();
    }

    const parsedLevel = Number(level);
    if ([1, 2, 3].includes(parsedLevel)) {
      payload.level = parsedLevel;
    }

    const parsedOrder = Number(order);
    if (Number.isFinite(parsedOrder)) {
      payload.order = parsedOrder;
    }

    if (status === 'active' || status === 'inactive') {
      payload.status = status;
    }

    if (typeof showInNavbar === 'boolean') {
      payload.showInNavbar = showInNavbar;
    }

    const category = await Category.create(payload);

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
