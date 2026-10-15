import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kanhaiyaastore_db_user:oRNMngwdALMQAWKa@kgs.30kdruk.mongodb.net/kanhaiya_store?appName=KGS&retryWrites=true&w=majority';

const categories = [
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000011'),
    name: 'Atta, Flours & Sooji',
    slug: 'atta-flours',
    description: 'Wholesome wheat atta, premium maida, besan, and roasted sooji for daily kitchen needs.',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/atta-flours',
    displayOrder: 1,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000012'),
    name: 'Rice & Grains',
    slug: 'rice-grains',
    description: 'Aromatic basmati, everyday steam rice, poha, and nutritious whole grains.',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/rice-grains',
    displayOrder: 2,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000013'),
    name: 'Dals & Pulses',
    slug: 'dals-pulses',
    description: 'Unpolished protein-rich arhar, moong, chana, and urad dals from trusted farmers.',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/dals-pulses',
    displayOrder: 3,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000014'),
    name: 'Oils & Ghee',
    slug: 'oils-ghee',
    description: 'Pure desi cow ghee, mustard oil, refined sunflower, and cooking oils.',
    imageUrl: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/oils-ghee',
    displayOrder: 4,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000015'),
    name: 'Spices & Masalas',
    slug: 'spices-masalas',
    description: 'Authentic whole and powdered spices, blended masalas, and iodised salts.',
    imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/spices-masalas',
    displayOrder: 5,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000016'),
    name: 'Snacks & Biscuits',
    slug: 'snacks',
    description: 'Crunchy namkeens, premium biscuits, tea, cookies, and packaged treats.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/snacks',
    displayOrder: 6,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000017'),
    name: 'Cleaning & Household Essentials',
    slug: 'cleaning',
    description: 'Laundry detergents, dishwash liquids, surface cleaners, and hygiene supplies.',
    imageUrl: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/cleaning',
    displayOrder: 7,
    isActive: true,
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000018'),
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Soaps, toothpastes, shampoos, and daily hygiene essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    imagePublicId: 'categories/personal-care',
    displayOrder: 8,
    isActive: true,
  },
];

const products = [
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000001'),
    name: 'Aashirvaad Shudh Chakki Atta',
    slug: 'aashirvaad-atta-5kg',
    description: '100% pure whole wheat flour processed with superior 40-step process for soft, fluffy rotis.',
    brand: 'Aashirvaad',
    sku: 'AASH-ATTA-5KG',
    barcode: '890103000001',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000011'),
    unit: 'kg',
    packSize: '5 kg',
    mrp: 295,
    sellingPrice: 265,
    stockQuantity: 50,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: true,
    isNewArrival: false,
    isBestseller: true,
    tags: ['atta', 'flour', 'staple', 'wheat'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/aashirvaad-atta',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000002'),
    name: 'Fortune Sunlite Refined Sunflower Oil',
    slug: 'fortune-sunflower-oil-1l',
    description: 'Light and healthy refined sunflower oil enriched with vitamins A & D for everyday healthy cooking.',
    brand: 'Fortune',
    sku: 'FORT-OIL-1L',
    barcode: '890103000002',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000014'),
    unit: 'l',
    packSize: '1 L Pouch',
    mrp: 165,
    sellingPrice: 142,
    stockQuantity: 45,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: true,
    isNewArrival: true,
    isBestseller: false,
    tags: ['oil', 'cooking oil', 'sunflower oil', 'fortune'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/fortune-oil',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000003'),
    name: 'Tata Sampann Unpolished Toor Dal',
    slug: 'tata-sampann-toor-dal-1kg',
    description: 'Unpolished Arhar / Toor Dal retaining natural taste, dietary fiber and rich plant protein.',
    brand: 'Tata Sampann',
    sku: 'TATA-TOOR-1KG',
    barcode: '890103000003',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000013'),
    unit: 'kg',
    packSize: '1 kg',
    mrp: 198,
    sellingPrice: 178,
    stockQuantity: 40,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: true,
    isNewArrival: false,
    isBestseller: false,
    tags: ['dal', 'pulses', 'toor dal', 'arhar dal', 'protein'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/tata-toor',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000004'),
    name: 'India Gate Basmati Rice Feast Rozzana',
    slug: 'india-gate-rozzana-5kg',
    description: 'Aromatic medium slender grains ideal for everyday fragrant rice and pulav preparations.',
    brand: 'India Gate',
    sku: 'IND-RICE-5KG',
    barcode: '890103000004',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000012'),
    unit: 'kg',
    packSize: '5 kg',
    mrp: 460,
    sellingPrice: 385,
    stockQuantity: 30,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: false,
    isNewArrival: false,
    isBestseller: true,
    tags: ['rice', 'basmati', 'grains'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/india-gate-rice',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000005'),
    name: 'Amul Pure Cow Ghee',
    slug: 'amul-cow-ghee-1l',
    description: 'Traditional granular aromatic pure cow ghee made from fresh milk cream.',
    brand: 'Amul',
    sku: 'AMUL-GHEE-1L',
    barcode: '890103000005',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000014'),
    unit: 'l',
    packSize: '1 L Tin',
    mrp: 650,
    sellingPrice: 615,
    stockQuantity: 25,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: true,
    isNewArrival: false,
    isBestseller: true,
    tags: ['ghee', 'amul', 'dairy', 'cow ghee'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/amul-ghee',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000006'),
    name: 'Tata Salt Vaccum Evaporated Iodised Salt',
    slug: 'tata-salt-1kg',
    description: 'Desh Ka Namak — purity and essential iodine guarantee for family health.',
    brand: 'Tata',
    sku: 'TATA-SALT-1KG',
    barcode: '890103000006',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000015'),
    unit: 'kg',
    packSize: '1 kg',
    mrp: 28,
    sellingPrice: 26,
    stockQuantity: 100,
    lowStockThreshold: 10,
    isAvailable: true,
    isPublished: true,
    isFeatured: false,
    isNewArrival: false,
    isBestseller: true,
    tags: ['salt', 'iodised salt', 'namak', 'tata salt'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/tata-salt',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000007'),
    name: 'Wagh Bakri Premium Leaf Tea',
    slug: 'wagh-bakri-tea-500g',
    description: 'Rich blend of premium Assam tea leaves delivering strong flavor and inviting golden color.',
    brand: 'Wagh Bakri',
    sku: 'WB-TEA-500G',
    barcode: '890103000007',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000016'),
    unit: 'g',
    packSize: '500 g',
    mrp: 290,
    sellingPrice: 265,
    stockQuantity: 40,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: false,
    isNewArrival: true,
    isBestseller: false,
    tags: ['tea', 'chai', 'beverage', 'wagh bakri'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/wagh-bakri-tea',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65f1a0000000000000000008'),
    name: 'Surf Excel Quick Wash Detergent Powder',
    slug: 'surf-excel-quick-wash-1kg',
    description: 'Combines the power of stain-removing ingredients with gentle fabric protection.',
    brand: 'Surf Excel',
    sku: 'SURF-EXCEL-1KG',
    barcode: '890103000008',
    categoryId: new mongoose.Types.ObjectId('65f1a0000000000000000017'),
    unit: 'kg',
    packSize: '1 kg',
    mrp: 155,
    sellingPrice: 139,
    stockQuantity: 50,
    lowStockThreshold: 5,
    isAvailable: true,
    isPublished: true,
    isFeatured: false,
    isNewArrival: false,
    isBestseller: true,
    tags: ['detergent', 'cleaning', 'surf excel', 'laundry'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=500&q=80',
        publicId: 'products/surf-excel',
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    reservedQuantity: 0,
    variants: [],
  },
];

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // 1. Update storeAddress in storesettings
  const targetAddress = 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh';
  const settingsUpdateResult = await db.collection('storesettings').updateMany(
    {},
    {
      $set: {
        storeAddress: targetAddress,
        updatedAt: new Date(),
      },
    }
  );
  console.log('Store settings updated:', settingsUpdateResult.modifiedCount, 'documents modified to:', targetAddress);

  // 2. Upsert categories
  for (const cat of categories) {
    await db.collection('categories').updateOne(
      { _id: cat._id },
      {
        $set: {
          ...cat,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Upserted ${categories.length} categories.`);

  // 3. Upsert products
  for (const prod of products) {
    await db.collection('products').updateOne(
      { _id: prod._id },
      {
        $set: {
          ...prod,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`Upserted ${products.length} products.`);

  const finalSettings = await db.collection('storesettings').findOne({});
  console.log('Final storeAddress in DB:', finalSettings?.storeAddress);

  const catCount = await db.collection('categories').countDocuments();
  const prodCount = await db.collection('products').countDocuments();
  console.log(`Total categories in DB: ${catCount}, Total products in DB: ${prodCount}`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
