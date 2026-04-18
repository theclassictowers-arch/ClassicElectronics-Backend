import dotenv from 'dotenv';
import Product from './models/Product.js';
import Category from './models/Category.js';
import connectDB from './config/db.js';

dotenv.config();

const parseStockFromStatus = (stockStatus) => {
  if (typeof stockStatus !== 'string') return 20;
  const match = stockStatus.match(/(\d+)/);
  if (match) return Number(match[1]) || 0;
  if (/out of stock/i.test(stockStatus)) return 0;
  if (/low stock/i.test(stockStatus)) return 5;
  if (/in stock/i.test(stockStatus)) return 50;
  return 20;
};

const DEFAULT_PRODUCT_IMAGE = '/uploads/products/default-product.jpeg';

const normalizeImagePath = (imagePath) => {
  if (typeof imagePath !== 'string' || !imagePath.trim()) return DEFAULT_PRODUCT_IMAGE;
  const cleaned = imagePath.trim();

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned; // External URLs ko waisa hi rehne dein
  }

  const fileName = cleaned.split('/').filter(Boolean).pop();
  // Ensure path starts with /uploads/products/
  return fileName ? `/uploads/products/${fileName}` : DEFAULT_PRODUCT_IMAGE;
};

const normalizeImages = (images) => {
  const mapped = (Array.isArray(images) ? images : []).map(normalizeImagePath).filter(Boolean);
  const unique = [...new Set(mapped)];
  return unique.length > 0 ? unique : [DEFAULT_PRODUCT_IMAGE];
};

const upsertCategory = async ({ name, slug, parent = null, level, order, showInNavbar = true }) => {
  return Category.findOneAndUpdate(
    { slug },
    {
      $set: {
        name,
        slug,
        parent,
        level,
        order,
        showInNavbar,
        status: 'active',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).select('_id slug');
};

const valveCategorySlug = ({ category, subcategory }) => {
  const base = category === 'Diaphragm Valves' ? 'diaphragm-valves' : 'solenoid-valves';
  const sub =
    subcategory === 'ASCO Type'
      ? 'asco-type'
      : subcategory === 'GOYEN Type'
        ? 'goyen-type'
        : subcategory === 'MECAIR Type'
          ? 'mecair-type'
          : subcategory === 'TURBO Type'
            ? 'turbo-type'
            : 'other';
  return `${base}/${sub}`;
};

const categorySlugForNonValves = (product) => {
  if (product?.category === 'Sensors') return 'sensors';

  const map = {
    'Sequential Timer Controllers': 'sequential-timer-controllers',
    'PLC Based Controllers': 'plc-based-controllers',
    'Differential Pressure Controllers': 'differential-pressure-controllers',
    'Multi-Channel Controllers': 'multi-channel-controllers',
    'Control Boards': 'control-boards',
    'Power Supplies': 'power-supplies',
    Sensors: 'sensors',
    'Timers & Relays': 'timers-relays',
  };

  return map[product?.subcategory] || map[product?.category] || null;
};

const seedData = async () => {
  await connectDB();

  try {
    console.log('Starting safe data sync (upsert mode)...');

    const rootDefinitions = [
      { name: 'Electronics', slug: 'electronics', level: 1, order: 1, showInNavbar: true },
      { name: 'Bag Filter Controllers', slug: 'bag-filter-controllers', level: 1, order: 2, showInNavbar: true },
      { name: 'Purging Valves', slug: 'purging-valves', level: 1, order: 3, showInNavbar: true },
    ];

    const rootMap = {};
    for (const def of rootDefinitions) {
      const category = await upsertCategory(def);
      rootMap[def.slug] = category._id;
    }

    const level2Definitions = [
      // Electronics
      { name: 'Control Boards', slug: 'control-boards', parentSlug: 'electronics', level: 2, order: 1 },
      { name: 'Power Supplies', slug: 'power-supplies', parentSlug: 'electronics', level: 2, order: 2 },
      { name: 'Sensors', slug: 'sensors', parentSlug: 'electronics', level: 2, order: 3 },
      { name: 'Timers & Relays', slug: 'timers-relays', parentSlug: 'electronics', level: 2, order: 4 },

      // Controllers
      { name: 'Sequential Timer Controllers', slug: 'sequential-timer-controllers', parentSlug: 'bag-filter-controllers', level: 2, order: 1 },
      { name: 'PLC Based Controllers', slug: 'plc-based-controllers', parentSlug: 'bag-filter-controllers', level: 2, order: 2 },
      { name: 'Differential Pressure Controllers', slug: 'differential-pressure-controllers', parentSlug: 'bag-filter-controllers', level: 2, order: 3 },
      { name: 'Multi-Channel Controllers', slug: 'multi-channel-controllers', parentSlug: 'bag-filter-controllers', level: 2, order: 4 },

      // Valves
      { name: 'Solenoid Valves', slug: 'solenoid-valves', parentSlug: 'purging-valves', level: 2, order: 1 },
      { name: 'Diaphragm Valves', slug: 'diaphragm-valves', parentSlug: 'purging-valves', level: 2, order: 2 },
    ];

    const level2Map = {};
    for (const def of level2Definitions) {
      const parentId = rootMap[def.parentSlug];
      if (!parentId) {
        throw new Error(`Missing parent category mapping for level-2 category: ${def.slug}`);
      }

      const category = await upsertCategory({
        name: def.name,
        slug: def.slug,
        parent: parentId,
        level: def.level,
        order: def.order,
      });

      level2Map[def.slug] = category._id;
    }

    const level3Definitions = [
      { name: 'ASCO Type', slug: 'solenoid-valves/asco-type', parentSlug: 'solenoid-valves', level: 3, order: 1 },
      { name: 'GOYEN Type', slug: 'solenoid-valves/goyen-type', parentSlug: 'solenoid-valves', level: 3, order: 2 },
      { name: 'MECAIR Type', slug: 'solenoid-valves/mecair-type', parentSlug: 'solenoid-valves', level: 3, order: 3 },
      { name: 'TURBO Type', slug: 'solenoid-valves/turbo-type', parentSlug: 'solenoid-valves', level: 3, order: 4 },
      { name: 'ASCO Type (Diaphragm)', slug: 'diaphragm-valves/asco-type', parentSlug: 'diaphragm-valves', level: 3, order: 1 },
      { name: 'GOYEN Type (Diaphragm)', slug: 'diaphragm-valves/goyen-type', parentSlug: 'diaphragm-valves', level: 3, order: 2 },
      { name: 'MECAIR Type (Diaphragm)', slug: 'diaphragm-valves/mecair-type', parentSlug: 'diaphragm-valves', level: 3, order: 3 },
      { name: 'TURBO Type (Diaphragm)', slug: 'diaphragm-valves/turbo-type', parentSlug: 'diaphragm-valves', level: 3, order: 4 },
    ];

    for (const def of level3Definitions) {
      const parentId = level2Map[def.parentSlug];
      if (!parentId) {
        throw new Error(`Missing parent category mapping for level-3 category: ${def.slug}`);
      }

      await upsertCategory({
        name: def.name,
        slug: def.slug,
        parent: parentId,
        level: def.level,
        order: def.order,
      });
    }

    const allCategories = await Category.find({}).select('_id slug').lean();
    const catMap = Object.fromEntries(allCategories.map((c) => [c.slug, c._id]));

    const seedProducts = [
      // ASCO Equivalent / Industrial Valves
      {
        name: 'SCG353A043',
        price: 12500,
        images: ['/valves-1.png'],
        slug: 'scg353a043-right-angle-valve',
        description: 'SCG353 series right angle type solenoid valve, 3/4" port size with threaded G/NPT connections. CE and ISO9001 certified.',
        specifications: {
          model: 'SCG353A043',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '3/4"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Right angle type solenoid valve with 3/4" port size. Suitable for dust collection systems and industrial automation.',
          features: ['Compact right-angle design', 'Quick response time', 'High reliability', 'Easy installation', 'Low power consumption'],
          applications: ['Dust collection systems', 'Pneumatic automation', 'Industrial cleaning equipment', 'Material handling systems'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCG353A044',
        price: 13500,
        images: ['/valves-1.png'],
        slug: 'scg353a044-right-angle-valve',
        description: 'SCG353 series right angle type solenoid valve, 1" port size with threaded G/NPT connections.',
        specifications: {
          model: 'SCG353A044',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '1"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Right angle type solenoid valve with 1" port size for standard flow applications.',
          features: ['Standard flow capacity', 'Durable construction', 'Quick response', 'Easy maintenance'],
          applications: ['Dust collectors', 'Pneumatic systems', 'Industrial automation'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCG353A047',
        price: 14500,
        images: ['/valves-3.png'],
        slug: 'scg353a047-right-angle-valve',
        description: 'SCG353 series right angle type solenoid valve, 1-1/4" port size for medium flow applications.',
        specifications: {
          model: 'SCG353A047',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '1-1/4"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Right angle type solenoid valve with 1-1/4" port size for medium flow requirements.',
          features: ['Medium flow capacity', 'Industrial-grade materials', 'Stable performance', 'Quick install'],
          applications: ['Dust collection', 'Pneumatic automation', 'Industrial processes'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCG353A050',
        price: 16500,
        images: ['/valves-2.png'],
        slug: 'scg353a050-right-angle-valve',
        description: 'SCG353 series right angle type solenoid valve, 1-1/2" port size. High flow capacity for industrial dust collection.',
        specifications: {
          model: 'SCG353A050',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '1-1/2"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Right angle solenoid valve with 1-1/2" port for high flow applications.',
          features: ['High flow capacity', 'Rugged build', 'Quick response', 'Reliable operation'],
          applications: ['Large dust collectors', 'Pneumatic conveying', 'Industrial automation'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCG353A051',
        price: 18500,
        images: ['/valves-3.png'],
        slug: 'scg353a051-right-angle-valve',
        description: 'SCG353 series right angle type solenoid valve, 2" port size for high flow applications.',
        specifications: {
          model: 'SCG353A051',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '2"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Large port right angle solenoid valve with 2" connection for high throughput systems.',
          features: ['Very high flow', 'Industrial durability', 'Stable sealing', 'Easy servicing'],
          applications: ['Dust collectors', 'Industrial pneumatics', 'High capacity systems'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCXE353.060',
        price: 17500,
        images: ['/valves-2.png'],
        slug: 'scxe353-060-right-angle-valve',
        description: 'SCXE353.060 equivalent solenoid valve for industrial use. Reliable and robust for dust collection systems.',
        specifications: {
          model: 'SCXE353.060',
          series: 'SCG353',
          type: 'Right Angle Type',
          portSize: '1-1/2"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'Both',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'SCXE353.060 right angle pulse valve for demanding industrial environments.',
          features: ['High reliability', 'Fast response', 'Long diaphragm life', 'Easy to maintain'],
          applications: ['Dust collection', 'Pulse jet cleaning', 'Industrial automation'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCR353A230',
        price: 19500,
        images: ['/valves-3.png'],
        slug: 'scr353a230-submerged-valve',
        description: 'SCR353 series submerged type solenoid valve, 3" immersion-type designed for direct manifold box mounting.',
        specifications: {
          model: 'SCR353A230',
          series: 'SCR353',
          type: 'Submerged Type',
          portSize: '3"',
          connectionType: 'Submerged',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Submerged pulse valve for direct manifold mounting, 3" port size.',
          features: ['Submerged mounting', 'High flow', 'Fast pulse', 'Robust diaphragm'],
          applications: ['Industrial dust collection', 'Manifold systems', 'Pulse jet cleaning'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'SCR353A235',
        price: 21500,
        images: ['/valves-3.png'],
        slug: 'scr353a235-submerged-valve',
        description: 'SCR353 series submerged type solenoid valve, 3.5" immersion-type for larger manifold applications.',
        specifications: {
          model: 'SCR353A235',
          series: 'SCR353',
          type: 'Submerged Type',
          portSize: '3.5"',
          connectionType: 'Submerged',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -10, max: 70, unit: 'Â°C' },
          diaphragmLifeCycles: 'Over 1 million cycles',
          certifications: ['CE', 'ISO9001'],
          description: 'Large submerged pulse valve (3.5") for high capacity manifold boxes.',
          features: ['Large port', 'High throughput', 'Manifold-friendly', 'Industrial grade'],
          applications: ['Large dust collectors', 'Industrial filtration', 'High capacity systems'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },

      // MECAIR Series 300
      {
        name: 'Mecair Dust-300 3/4"',
        price: 15000,
        images: ['/valve-placeholder-mecair-1.svg'],
        slug: 'mecair-dust-300-3-4-diaphragm-valve',
        description: 'Mecair Series 300 diaphragm valve, 3/4" port size, designed for dust collector applications with reverse pulse jet filter cleaning.',
        specifications: {
          model: 'Dust-300-3/4',
          series: 'SCG353',
          type: 'Solenoid Valve',
          portSize: '3/4"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -5, max: 80, unit: 'Â°C' },
          diaphragmLifeCycles: '1 million+',
          certifications: ['CE', 'ISO9001'],
          description: 'Mecair Series 300 diaphragm valve for dust collector reverse pulse jet filter cleaning.',
        },
        stockStatus: 'In Stock',
        category: 'Diaphragm Valves',
        subcategory: 'MECAIR Type',
      },
      {
        name: 'Mecair Dust-300 1"',
        price: 16500,
        images: ['/valve-placeholder-mecair-2.svg'],
        slug: 'mecair-dust-300-1-diaphragm-valve',
        description: 'Mecair Series 300 diaphragm valve, 1" port size for medium capacity dust collection systems.',
        specifications: {
          model: 'Dust-300-1',
          series: 'SCG353',
          type: 'Solenoid Valve',
          portSize: '1"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -5, max: 80, unit: 'Â°C' },
          diaphragmLifeCycles: '1 million+',
          certifications: ['CE', 'ISO9001'],
          description: 'Mecair Series 300 diaphragm valve with 1" port size for medium flow dust collector systems.',
        },
        stockStatus: 'In Stock',
        category: 'Diaphragm Valves',
        subcategory: 'MECAIR Type',
      },
      {
        name: 'Mecair Dust-300 1.5"',
        price: 18500,
        images: ['/valve-placeholder-mecair-3.svg'],
        slug: 'mecair-dust-300-1-5-diaphragm-valve',
        description: 'Mecair Series 300 diaphragm valve, 1.5" port size for high capacity dust collection systems.',
        specifications: {
          model: 'Dust-300-1.5',
          series: 'SCG353',
          type: 'Solenoid Valve',
          portSize: '1.5"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -5, max: 80, unit: 'Â°C' },
          diaphragmLifeCycles: '1 million+',
          certifications: ['CE', 'ISO9001'],
          description: 'High capacity Mecair Series 300 diaphragm valve for large dust collection installations.',
        },
        stockStatus: 'Low Stock',
        category: 'Diaphragm Valves',
        subcategory: 'MECAIR Type',
      },

      // BEOT
      {
        name: 'BEOT Standard 1/8"',
        price: 8500,
        images: ['/valve-placeholder-beot-1.svg'],
        slug: 'beot-standard-1-8-solenoid-valve',
        description: 'BEOT standard solenoid valve, 1/8" port size. Compact design for small automation applications.',
        specifications: {
          model: 'BEOT-1/8-STD',
          series: 'SCG353',
          type: 'Solenoid Valve',
          portSize: '1/8"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -5, max: 80, unit: 'Â°C' },
          diaphragmLifeCycles: '1 million+',
          certifications: ['CE'],
          description: 'BEOT standard series with small 1/8" port size.',
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'BEOT Standard 1/4"',
        price: 9500,
        images: ['/valve-placeholder-beot-2.svg'],
        slug: 'beot-standard-1-4-solenoid-valve',
        description: 'BEOT standard solenoid valve, 1/4" port size. Suitable for medium flow applications.',
        specifications: {
          model: 'BEOT-1/4-STD',
          series: 'SCG353',
          type: 'Solenoid Valve',
          portSize: '1/4"',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
          diaphragmMaterial: 'NBR',
          temperatureRange: { min: -5, max: 80, unit: 'Â°C' },
          diaphragmLifeCycles: '1 million+',
          certifications: ['CE'],
          description: 'BEOT standard series with medium 1/4" port size.',
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },

      // GOYEN TMF Series
      {
        name: 'TMF-Z-20',
        price: 20933,
        images: ['/valves-1.png'],
        slug: 'tmf-z-20-goyen-valve',
        description: 'High-quality TMF-Z-20 for industrial applications. This Solenoid Valves product is built to meet international standards and ensure reliable performance in demanding environments.',
        specifications: {
          model: 'TMF-Z-20',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '20mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: '57 in stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },
      {
        name: 'TMF-Z-25',
        price: 22933,
        images: ['/valves-1.png'],
        slug: 'tmf-z-25-goyen-valve',
        description: 'TMF-Z-25 solenoid valve with 25mm port size. Enhanced version for higher flow applications.',
        specifications: {
          model: 'TMF-Z-25',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '25mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },
      {
        name: 'TMF-Z-40S',
        price: 26933,
        images: ['/valves-2.png'],
        slug: 'tmf-z-40s-goyen-valve',
        description: 'TMF-Z-40S solenoid valve with 40mm port size. Specialized version for industrial applications.',
        specifications: {
          model: 'TMF-Z-40S',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '40mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },
      {
        name: 'TMF-Z-50S',
        price: 29933,
        images: ['/valves-3.png'],
        slug: 'tmf-z-50s-goyen-valve',
        description: 'TMF-Z-50S solenoid valve with 50mm port size. High capacity valve for heavy duty applications.',
        specifications: {
          model: 'TMF-Z-50S',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '50mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },
      {
        name: 'TMF-Z-62S',
        price: 32933,
        images: ['/valves-3.png'],
        slug: 'tmf-z-62s-goyen-valve',
        description: 'TMF-Z-62S solenoid valve with 62mm port size for high throughput dust collection systems.',
        specifications: {
          model: 'TMF-Z-62S',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '62mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },
      {
        name: 'TMF-Z-76S',
        price: 35933,
        images: ['/valves-3.png'],
        slug: 'tmf-z-76s-goyen-valve',
        description: 'TMF-Z-76S solenoid valve with 76mm port size. Maximum capacity valve for large industrial systems.',
        specifications: {
          model: 'TMF-Z-76S',
          series: 'GOYEN',
          type: 'Solenoid Valve',
          portSize: '76mm',
          connectionType: 'Threaded (G/NPT)',
          workingPressure: { mpa: [0.3, 0.8], psi: [43.5, 116] },
          voltageOptions: ['AC110V', 'AC220V', 'DC24V'],
        },
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'GOYEN Type',
      },

      // Controllers / Electronics / Sensors
      {
        name: 'Sequential Timer Controller',
        price: 18900,
        images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80'],
        slug: 'sequential-timer-controller',
        description: 'Advanced sequential timer controller for industrial automation with multiple channel control.',
        stockStatus: 'In Stock',
        category: 'Controllers',
        subcategory: 'Sequential Timer Controllers',
      },
      {
        name: 'PLC Based Controller',
        price: 32500,
        images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80'],
        slug: 'plc-based-controller',
        description: 'Programmable Logic Controller based industrial automation system.',
        stockStatus: 'In Stock',
        category: 'Controllers',
        subcategory: 'PLC Based Controllers',
      },
      {
        name: 'Control Board for Dust Collector',
        price: 8500,
        images: ['https://images.unsplash.com/photo-1555664424-778a6902201b?auto=format&fit=crop&q=80'],
        slug: 'control-board-dust-collector',
        description: 'Main control board for industrial dust collection systems.',
        stockStatus: 'In Stock',
        category: 'Electronics',
        subcategory: 'Control Boards',
      },
      {
        name: 'Industrial Power Supply 24V DC',
        price: 4200,
        images: ['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80'],
        slug: 'industrial-power-supply-24v-dc',
        description: '24V DC industrial power supply for automation equipment.',
        stockStatus: 'In Stock',
        category: 'Electronics',
        subcategory: 'Power Supplies',
      },
      {
        name: 'Differential Pressure Sensor',
        price: 12500,
        images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80'],
        slug: 'differential-pressure-sensor',
        description: 'High accuracy differential pressure sensor for industrial applications.',
        stockStatus: 'In Stock',
        category: 'Sensors',
        subcategory: 'Pressure Sensors',
      },
      {
        name: 'Industrial Timer Module',
        price: 12500,
        images: ['/images/products/default-product.jpeg'],
        slug: 'industrial-timer-module',
        description: 'High-precision industrial timer module for automation systems.',
        stockStatus: 'In Stock',
        category: 'Controllers',
        subcategory: 'Sequential Timer Controllers',
      },
      {
        name: 'Pneumatic Solenoid Valve',
        price: 8900,
        images: ['/images/products/valves-1.png'],
        slug: 'pneumatic-solenoid-valve',
        description: 'Reliable pneumatic solenoid valve for industrial applications.',
        stockStatus: 'In Stock',
        category: 'Solenoid Valves',
        subcategory: 'ASCO Type',
      },
      {
        name: 'Pressure Gauge Digital',
        price: 5400,
        images: ['/images/products/default-product.jpeg'],
        slug: 'pressure-gauge-digital',
        description: 'Digital pressure gauge with high accuracy readings.',
        stockStatus: 'In Stock',
        category: 'Sensors',
        subcategory: 'Pressure Sensors',
      },
      {
        name: 'Control Panel Interface',
        price: 28000,
        images: ['/images/products/default-product.jpeg'],
        slug: 'control-panel-interface',
        description: 'Advanced control panel interface for industrial systems.',
        stockStatus: 'In Stock',
        category: 'Electronics',
        subcategory: 'Control Boards',
      },
    ];

    const products = seedProducts.map((p) => {
      const isValve = p.category === 'Solenoid Valves' || p.category === 'Diaphragm Valves';

      const categorySlug = isValve ? valveCategorySlug(p) : categorySlugForNonValves(p);
      if (!categorySlug || !catMap[categorySlug]) {
        throw new Error(`Missing category mapping for product slug="${p.slug}" -> categorySlug="${categorySlug}"`);
      }

      return {
        ...p,
        categoryId: catMap[categorySlug],
        stock: parseStockFromStatus(p.stockStatus),
        images: normalizeImages(p.images),
        status: 'active',
      };
    });

    const seen = new Set();
    for (const p of products) {
      if (!p.slug) throw new Error('Seed product missing slug');
      if (seen.has(p.slug)) throw new Error(`Duplicate seed slug: ${p.slug}`);
      seen.add(p.slug);
    }

    const stats = { inserted: 0, updated: 0, unchanged: 0 };

    for (const product of products) {
      const existing = await Product.findOne({ slug: product.slug }).select('_id').lean();

      if (!existing) {
        await Product.create(product);
        stats.inserted += 1;
        continue;
      }

      const result = await Product.updateOne(
        { _id: existing._id },
        { $set: product },
      );

      if (result.modifiedCount > 0) {
        stats.updated += 1;
      } else {
        stats.unchanged += 1;
      }
    }

    console.log(
      `Data sync completed. Inserted: ${stats.inserted}, Updated: ${stats.updated}, Unchanged: ${stats.unchanged}`,
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
