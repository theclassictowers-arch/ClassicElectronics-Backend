import Page from '../models/Page.js';

// @desc    Get page content by slug
// @route   GET /api/pages/:slug
// @access  Public
export const getPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await Page.findOne({ slug: slug.toLowerCase().trim() }).lean();

    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.status(200).json(page);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update page content (creates if not exists)
// @route   PUT /api/pages/:slug
// @access  Private (Admin)
export const updatePage = async (req, res) => {
  const { slug } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'object') {
    return res.status(400).json({ message: 'content object is required' });
  }

  try {
    const page = await Page.findOneAndUpdate(
      { slug: slug.toLowerCase().trim() },
      { slug: slug.toLowerCase().trim(), content },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(page);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all pages
// @route   GET /api/pages
// @access  Public
export const getPages = async (req, res) => {
  try {
    const pages = await Page.find().sort({ slug: 1 }).lean();
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
