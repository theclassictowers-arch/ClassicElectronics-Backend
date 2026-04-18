import Theme from '../models/Theme.js';

// @desc    Get theme settings
// @route   GET /api/theme
// @access  Public
export const getTheme = async (req, res) => {
  try {
    // Return the first theme document or default
    let theme = await Theme.findOne();
    if (!theme) {
      theme = await Theme.create({});
    }
    res.status(200).json(theme);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update theme settings
// @route   PUT /api/theme
// @access  Private
export const updateTheme = async (req, res) => {
  try {
    let theme = await Theme.findOne();

    if (!theme) {
      theme = await Theme.create(req.body);
    } else {
      theme = await Theme.findByIdAndUpdate(theme._id, req.body, { new: true });
    }

    res.status(200).json(theme);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
