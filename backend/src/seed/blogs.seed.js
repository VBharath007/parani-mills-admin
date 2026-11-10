const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { db } = require('../config/firebase');

const sampleBlogs = [
  {
    title: 'Smart Spraying Techniques for Crop Protection & Higher Yields',
    category: 'Agriculture',
    excerpt: 'Learn how modern 4-stroke power sprayers and portable battery sprayers ensure uniform pesticide and fertilizer delivery across paddy, sugarcane, and cotton crops.',
    content: 'Spraying is a critical phase in modern agriculture. High-pressure knapsack sprayers and 12V battery sprayers ensure fine droplet atomization, allowing micronutrients and pest repellents to penetrate deep under thick plant foliage. Proper calibration of nozzle pressure helps Tamil Nadu farmers save up to 30% in chemical costs while avoiding leaf scorch and soil toxicity.',
    author: 'Senior Agronomist',
    isPublished: true,
  },
  {
    title: 'How to Choose the Right 10 KVA Diesel Generator for Commercial & Mill Operations',
    category: 'Gensets',
    excerpt: 'A complete buying guide evaluating copper alternator winding, acoustic silent canopies, and fuel economy for industrial backup power.',
    content: 'Industrial power cuts can halt agro-processing units, flour mills, and irrigation channels. When choosing a commercial 10 KVA diesel genset, evaluate single-phase vs three-phase output, water-cooled vs air-cooled diesel engines, automatic transfer switches (ATS), and sound-dampening acoustic enclosures. Regular oil filter and fuel-water separator maintenance ensures a 15,000+ hour operating life.',
    author: 'Power Systems Engineer',
    isPublished: true,
  },
  {
    title: 'Routine Maintenance Checklist for Centrifugal & Agricultural Water Pumps',
    category: 'Pumps & Motors',
    excerpt: 'Prevent impeller cavitation, bearing overheating, and gland packing leaks during peak irrigation seasons with these proven maintenance practices.',
    content: 'Centrifugal water pumps are the backbone of agricultural irrigation across Madurai and the Cauvery delta. Always check foot valve sealing to prevent suction air pockets, inspect mechanical seals for wear, and grease bearing housings every 250 running hours. Installing a thermal overload protector prevents motor burnout during voltage fluctuations.',
    author: 'Service Division Lead',
    isPublished: true,
  },
  {
    title: 'Maximizing Soil Fertility with Power Weeders & Mini Tillers',
    category: 'Agriculture',
    excerpt: 'Discover how rotary blade tillers aerate soil, eliminate stubborn weeds without herbicides, and conserve root moisture in vegetable farms.',
    content: 'Manual weeding is labor-intensive and slow. A 7HP petrol/diesel power weeder with hardened rotary tines accomplishes 1 acre of inter-cultivation weeding in under 2 hours. Soil aeration promotes beneficial microbial activity and improves fertilizer uptake, while turning mulched weed matter into organic compost.',
    author: 'Farm Equipment Specialist',
    isPublished: true,
  },
  {
    title: 'Safe Operation & Blade Sharpening Guide for Commercial Chaff Cutters',
    category: 'Equipment Guide',
    excerpt: 'Essential safety protocols and high-carbon blade maintenance tips to achieve optimal green and dry fodder digestion for dairy cattle.',
    content: 'Modern heavy-duty chaff cutters with electric motors and safety reverse gears process green maize, napier grass, and dry straw into 15mm-20mm digestible cattle feed. Keeping shear blades sharpened at a 30-degree bevel reduces motor load, cuts electricity consumption by 20%, and prevents livestock indigestion from coarse fibers.',
    author: 'Dairy Tech Consultant',
    isPublished: true,
  },
];

const generateSlug = (text) => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const seedBlogs = async () => {
  try {
    console.log('Seeding blog articles into Firebase Firestore...');
    const blogsRef = db.collection('blogs');

    // Fetch existing blogs
    const snapshot = await blogsRef.get();
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing blogs. Cleaning up for clean seed...`);
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('Cleared previous blogs.');
    }

    const timestamp = new Date().toISOString();
    const batch = db.batch();

    sampleBlogs.forEach((blog) => {
      const docRef = blogsRef.doc();
      batch.set(docRef, {
        ...blog,
        slug: generateSlug(blog.title),
        coverImage: blog.coverImage || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    await batch.commit();
    console.log(`🔥 Successfully seeded ${sampleBlogs.length} blog articles into Firestore!`);
    sampleBlogs.forEach((b, idx) => {
      console.log(`[${idx + 1}] ${b.title} (${b.category})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs into Firestore:', error.message);
    process.exit(1);
  }
};

seedBlogs();
