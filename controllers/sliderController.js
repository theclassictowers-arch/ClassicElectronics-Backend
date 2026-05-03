import Slider from '../models/Slider.js';

// @desc    Get all sliders
// @route   GET /api/sliders
// @access  Public
export const getSliders = async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ order: 1 }).lean();
    res.status(200).json(sliders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single slider
// @route   GET /api/sliders/:id
// @access  Public
export const getSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id).lean();
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }
    res.status(200).json(slider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create slider
// @route   POST /api/sliders
// @access  Private (Admin)
export const createSlider = async (req, res) => {
  const { badge, title, subtitle, highlight, bgImage, primaryButtonText, link, secondaryButtonText, secondaryLink, order, isActive } = req.body;

  if (!title || !subtitle || !highlight || !bgImage || !link) {
    return res.status(400).json({ message: 'Please add all required fields (title, subtitle, highlight, bgImage, link)' });
  }

  try {
    // If no order provided, put it at the end
    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null) {
      const count = await Slider.countDocuments();
      finalOrder = count;
    }

    const slider = await Slider.create({
      badge,
      title,
      subtitle,
      highlight,
      bgImage,
      primaryButtonText,
      link,
      secondaryButtonText,
      secondaryLink,
      order: finalOrder,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(slider);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update slider
// @route   PUT /api/sliders/:id
// @access  Private (Admin)
export const updateSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    const updatedSlider = await Slider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedSlider);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete slider
// @route   DELETE /api/sliders/:id
// @access  Private (Admin)
export const deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    await slider.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reorder sliders
// @route   PUT /api/sliders/reorder
// @access  Private (Admin)
export const reorderSliders = async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ message: 'orderedIds array is required' });
  }

  try {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await Slider.bulkWrite(bulkOps);

    const sliders = await Slider.find().sort({ order: 1 }).lean();
    res.status(200).json(sliders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

