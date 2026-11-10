const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { db } = require('../config/firebase');

const sampleProducts = [
  {
    name: 'High-Performance Crop Sprayer',
    category: 'Sprayers',
    price: 6499,
    stock: 45,
    description: 'High pressure 4-stroke crop power sprayer engineered for uniform fertilizer and pesticide distribution across paddy and sugarcane plantations.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727377/parani_mill_stores/products/knapsack-sprayer.png'],
    isActive: true,
  },
  {
    name: 'Portable Battery Sprayer',
    category: 'Sprayers',
    price: 3299,
    stock: 60,
    description: '12V 12Ah rechargeable lithium battery knapsack sprayer with brass telescopic lance and dual speed regulator.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727378/parani_mill_stores/products/portable-battery-sprayer.png'],
    isActive: true,
  },
  {
    name: 'Power Weeder & Tiller Machine',
    category: 'Weeders',
    price: 28500,
    stock: 18,
    description: '7 HP heavy-duty petrol rotary tiller with heat-treated carbon steel blades for inter-cultivation and de-weeding.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727381/parani_mill_stores/products/power-weeder-700g.png'],
    isActive: true,
  },
  {
    name: 'Mini Tiller 3800G',
    category: 'Weeders',
    price: 19500,
    stock: 22,
    description: 'Compact 52CC mini tiller weeder designed for horticulture, nursery beds, and tight vegetable crop rows.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727379/parani_mill_stores/products/mini-tiller-3800g.png'],
    isActive: true,
  },
  {
    name: 'Heavy Duty Brush Cutter',
    category: 'Brush Cutters',
    price: 11200,
    stock: 35,
    description: '50CC 4-stroke multipurpose brush cutter with 80T carbide tipped saw blade, 3T metal blade, and nylon tap-and-go head.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727368/parani_mill_stores/products/brush-cutter-4s.png'],
    isActive: true,
  },
  {
    name: 'Trolley Brush Cutter',
    category: 'Brush Cutters',
    price: 14500,
    stock: 14,
    description: 'Wheeled walk-behind trolley brush cutter for effortless, ergonomic grass clearance across orchard and farm perimeters.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727369/parani_mill_stores/products/trolley-brush-cutter.png'],
    isActive: true,
  },
  {
    name: 'Centrifugal Water Pump WA30',
    category: 'Pumps & Motors',
    price: 13800,
    stock: 28,
    description: '3-inch self-priming petrol agricultural water pump delivering 1000 LPM flow rate with 30m total head height.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727374/parani_mill_stores/products/petrol-water-pump-wa30.png'],
    isActive: true,
  },
  {
    name: 'High Discharge Water Pump 30R',
    category: 'Pumps & Motors',
    price: 15200,
    stock: 19,
    description: 'Heavy duty Cast Iron impeller pump with vibration-dampened cradle frame and oil-alert sensor protection.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727374/parani_mill_stores/products/water-pump-30r.png'],
    isActive: true,
  },
  {
    name: 'Diesel Generator 10 KVA',
    category: 'Machinery',
    price: 89000,
    stock: 8,
    description: 'Silent canopy commercial 10 KVA diesel generator with 100% pure copper alternator, digital AVR, and electric self-start.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727371/parani_mill_stores/products/diesel-generator.jpg'],
    isActive: true,
  },
  {
    name: 'Industrial Earth Auger 63CC',
    category: 'Machinery',
    price: 12400,
    stock: 24,
    description: 'Powerful 63CC two-stroke post hole digger complete with 8-inch spiral drill bit for fencing and plantation sapling holes.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727372/parani_mill_stores/products/earth-auger-6310.png'],
    isActive: true,
  },
  {
    name: 'Commercial Chaff Cutter Machine',
    category: 'Machinery',
    price: 24000,
    stock: 12,
    description: 'High throughput motorized fodder and straw cutter with reverse gear safety mechanism and 4 alloy steel cutting blades.',
    images: ['https://res.cloudinary.com/dbvns9uwy/image/upload/v1789727370/parani_mill_stores/products/chaff-cutter-9zp.png'],
    isActive: true,
  },
];

const generateSlug = (text) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const seedProducts = async () => {
  try {
    console.log('Seeding products catalog into Firebase Firestore...');
    const productsRef = db.collection('products');

    // Fetch existing products
    const snapshot = await productsRef.get();
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing products. Clearing for clean seed...`);
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('Cleared previous products.');
    }

    const timestamp = new Date().toISOString();
    const batch = db.batch();

    sampleProducts.forEach((prod) => {
      const docRef = productsRef.doc();
      batch.set(docRef, {
        ...prod,
        slug: generateSlug(prod.name),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    await batch.commit();
    console.log(`🔥 Successfully seeded ${sampleProducts.length} products into Firestore!`);
    sampleProducts.forEach((p, idx) => {
      console.log(`[${idx + 1}] ${p.name} - ₹${p.price.toLocaleString()} (${p.category})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products into Firestore:', error.message);
    process.exit(1);
  }
};

seedProducts();
