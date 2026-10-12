import mongoose from 'mongoose';
import { Product, IProduct, IProductImage } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { slugify } from '../../utils/slugify';
import { deleteCloudinaryImage } from '../../config/cloudinary';
import { logger } from '../../utils/logger';

export interface ListProductsFilter {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  subcategoryId?: string;
  tag?: string;
  brand?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestseller?: boolean;
  inStock?: boolean;
  isPublished?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'stock_asc';
  isAdmin?: boolean;
}

export class ProductService {
  /**
   * List products with search, filtering, sorting, and pagination
   */
  static async listProducts(filter: ListProductsFilter) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Publication filter
    if (!filter.isAdmin) {
      query.isPublished = true;
    } else if (filter.isPublished !== undefined) {
      query.isPublished = filter.isPublished;
    }

    // Category filter
    if (filter.categoryId && mongoose.Types.ObjectId.isValid(filter.categoryId)) {
      query.categoryId = new mongoose.Types.ObjectId(filter.categoryId);
    }

    if (filter.subcategoryId && mongoose.Types.ObjectId.isValid(filter.subcategoryId)) {
      query.subcategoryId = new mongoose.Types.ObjectId(filter.subcategoryId);
    }

    // Tag filter
    if (filter.tag) {
      query.tags = { $in: [filter.tag.trim()] };
    }

    // Brand filter
    if (filter.brand) {
      query.brand = { $regex: filter.brand.trim(), $options: 'i' };
    }

    // Merchandising flags
    if (filter.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
    if (filter.isNewArrival !== undefined) query.isNewArrival = filter.isNewArrival;
    if (filter.isBestseller !== undefined) query.isBestseller = filter.isBestseller;

    // Stock availability filter
    if (filter.inStock) {
      query.stockQuantity = { $gt: 0 };
      query.isAvailable = true;
    }

    // Price range
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      query.sellingPrice = {};
      if (filter.minPrice !== undefined) query.sellingPrice.$gte = filter.minPrice;
      if (filter.maxPrice !== undefined) query.sellingPrice.$lte = filter.maxPrice;
    }

    // Full search (text index or regex fallback)
    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { tags: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
      ];
    }

    // Sorting
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    switch (filter.sort) {
      case 'price_asc':
        sortOptions = { sellingPrice: 1 };
        break;
      case 'price_desc':
        sortOptions = { sellingPrice: -1 };
        break;
      case 'name_asc':
        sortOptions = { name: 1 };
        break;
      case 'stock_asc':
        sortOptions = { stockQuantity: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const [total, items] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate('categoryId', 'name slug imageUrl')
        .populate('subcategoryId', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formattedItems = items.map((item) => this.formatProduct(item));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get curated collections for customer home screen
   */
  static async getCollections() {
    const baseQuery = { isPublished: true };

    const [featured, newArrivals, bestsellers, essentials] = await Promise.all([
      Product.find({ ...baseQuery, isFeatured: true })
        .populate('categoryId', 'name slug imageUrl')
        .populate('subcategoryId', 'name slug')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      Product.find({ ...baseQuery, isNewArrival: true })
        .populate('categoryId', 'name slug imageUrl')
        .populate('subcategoryId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Product.find({ ...baseQuery, isBestseller: true })
        .populate('categoryId', 'name slug imageUrl')
        .populate('subcategoryId', 'name slug')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),
      Product.find({ ...baseQuery, isAvailable: true, stockQuantity: { $gt: 0 } })
        .populate('categoryId', 'name slug imageUrl')
        .populate('subcategoryId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    return {
      featured: featured.map((p) => this.formatProduct(p)),
      newArrivals: newArrivals.map((p) => this.formatProduct(p)),
      bestsellers: bestsellers.map((p) => this.formatProduct(p)),
      essentials: essentials.map((p) => this.formatProduct(p)),
    };
  }

  /**
   * Get related products in the same category
   */
  static async getRelatedProducts(idOrSlug: string, limit = 6) {
    let currentProduct: any = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      currentProduct = await Product.findById(idOrSlug).lean();
    } else {
      currentProduct = await Product.findOne({ slug: idOrSlug.toLowerCase() }).lean();
    }

    if (!currentProduct) {
      return [];
    }

    const targetCategoryId = currentProduct.categoryId?._id || currentProduct.categoryId;

    const related = await Product.find({
      _id: { $ne: currentProduct._id },
      categoryId: targetCategoryId,
      isPublished: true,
      isAvailable: true,
    })
      .populate('categoryId', 'name slug imageUrl')
      .populate('subcategoryId', 'name slug')
      .sort({ stockQuantity: -1 })
      .limit(limit)
      .lean();

    return related.map((p) => this.formatProduct(p));
  }

  /**
   * Get product by ID or slug
   */
  static async getProductByIdOrSlug(idOrSlug: string, isAdmin = false) {
    const query: Record<string, any> = {};
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query._id = new mongoose.Types.ObjectId(idOrSlug);
    } else {
      query.slug = idOrSlug.toLowerCase();
    }

    if (!isAdmin) {
      query.isPublished = true;
    }

    const product = await Product.findOne(query)
      .populate('categoryId', 'name slug imageUrl')
      .populate('subcategoryId', 'name slug')
      .lean();

    if (!product) {
      throw new NotFoundError(`Product '${idOrSlug}' not found.`);
    }

    return this.formatProduct(product);
  }

  /**
   * Create a new product
   */
  static async createProduct(data: any) {
    // 1. Verify Category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new BadRequestError(`Category with ID ${data.categoryId} does not exist.`);
    }

    if (data.subcategoryId) {
      const subcategory = await Category.findById(data.subcategoryId);
      if (!subcategory) {
        throw new BadRequestError(`Subcategory with ID ${data.subcategoryId} does not exist.`);
      }
    }

    // 2. Validate SKU uniqueness if provided
    if (data.sku && data.sku.trim()) {
      const existingSku = await Product.findOne({ sku: data.sku.trim() });
      if (existingSku) {
        throw new BadRequestError(`Product with SKU '${data.sku}' already exists.`);
      }
    }

    // 3. Generate unique slug
    let finalSlug = data.slug ? slugify(data.slug) : slugify(data.name);
    const existingSlug = await Product.findOne({ slug: finalSlug });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // 4. Normalize primary image
    const images: IProductImage[] = (data.images || []).map((img: any, idx: number) => ({
      url: img.url,
      publicId: img.publicId,
      isPrimary: img.isPrimary ?? idx === 0,
      sortOrder: img.sortOrder ?? idx,
    }));

    if (images.length > 0 && !images.some((img) => img.isPrimary)) {
      images[0].isPrimary = true;
    }

    const product = await Product.create({
      ...data,
      slug: finalSlug,
      sku: data.sku && data.sku.trim() ? data.sku.trim() : undefined,
      images,
    });

    const populated = await Product.findById(product._id)
      .populate('categoryId', 'name slug imageUrl')
      .populate('subcategoryId', 'name slug')
      .lean();

    return this.formatProduct(populated!);
  }

  /**
   * Update an existing product
   */
  static async updateProduct(id: string, data: any) {
    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found.`);
    }

    // Validate category
    if (data.categoryId) {
      const category = await Category.findById(data.categoryId);
      if (!category) {
        throw new BadRequestError(`Category with ID ${data.categoryId} does not exist.`);
      }
      product.categoryId = new mongoose.Types.ObjectId(data.categoryId);
    }

    if (data.subcategoryId !== undefined) {
      if (data.subcategoryId) {
        const sub = await Category.findById(data.subcategoryId);
        if (!sub) {
          throw new BadRequestError(`Subcategory with ID ${data.subcategoryId} does not exist.`);
        }
        product.subcategoryId = new mongoose.Types.ObjectId(data.subcategoryId);
      } else {
        product.subcategoryId = null;
      }
    }

    // Validate SKU uniqueness
    if (data.sku !== undefined) {
      const trimmedSku = data.sku ? data.sku.trim() : undefined;
      if (trimmedSku && trimmedSku !== product.sku) {
        const existingSku = await Product.findOne({ sku: trimmedSku, _id: { $ne: product._id } });
        if (existingSku) {
          throw new BadRequestError(`Product with SKU '${trimmedSku}' already exists.`);
        }
      }
      product.sku = trimmedSku;
    }

    // Slug update
    if (data.slug) {
      const newSlug = slugify(data.slug);
      if (newSlug !== product.slug) {
        const slugExists = await Product.findOne({ slug: newSlug, _id: { $ne: product._id } });
        if (slugExists) {
          throw new BadRequestError(`Product slug '${newSlug}' is already taken.`);
        }
        product.slug = newSlug;
      }
    }

    // Image cleanup on gallery update
    if (data.images) {
      const oldPublicIds = new Set(product.images.map((img) => img.publicId));
      const newPublicIds = new Set((data.images as IProductImage[]).map((img) => img.publicId));

      // Remove orphaned images from Cloudinary
      for (const oldId of oldPublicIds) {
        if (!newPublicIds.has(oldId)) {
          try {
            await deleteCloudinaryImage(oldId);
          } catch (err) {
            logger.warn(`Failed to cleanup Cloudinary asset ${oldId}:`, err);
          }
        }
      }

      product.images = data.images.map((img: any, idx: number) => ({
        url: img.url,
        publicId: img.publicId,
        isPrimary: img.isPrimary ?? idx === 0,
        sortOrder: img.sortOrder ?? idx,
      }));

      if (product.images.length > 0 && !product.images.some((img) => img.isPrimary)) {
        product.images[0].isPrimary = true;
      }
    }

    // Assign scalar fields
    if (data.name !== undefined) product.name = data.name;
    if (data.description !== undefined) product.description = data.description;
    if (data.brand !== undefined) product.brand = data.brand;
    if (data.barcode !== undefined) product.barcode = data.barcode;
    if (data.unit !== undefined) product.unit = data.unit;
    if (data.packSize !== undefined) product.packSize = data.packSize;
    if (data.mrp !== undefined) product.mrp = data.mrp;
    if (data.sellingPrice !== undefined) product.sellingPrice = data.sellingPrice;
    if (data.stockQuantity !== undefined) product.stockQuantity = data.stockQuantity;
    if (data.lowStockThreshold !== undefined) product.lowStockThreshold = data.lowStockThreshold;
    if (data.isAvailable !== undefined) product.isAvailable = data.isAvailable;
    if (data.isPublished !== undefined) product.isPublished = data.isPublished;
    if (data.isFeatured !== undefined) product.isFeatured = data.isFeatured;
    if (data.isNewArrival !== undefined) product.isNewArrival = data.isNewArrival;
    if (data.isBestseller !== undefined) product.isBestseller = data.isBestseller;
    if (data.tags !== undefined) product.tags = data.tags;
    if (data.variants !== undefined) product.variants = data.variants;

    await product.save();

    const populated = await Product.findById(product._id)
      .populate('categoryId', 'name slug imageUrl')
      .populate('subcategoryId', 'name slug')
      .lean();

    return this.formatProduct(populated!);
  }

  /**
   * Toggle published state
   */
  static async togglePublish(id: string, isPublished: boolean) {
    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found.`);
    }

    product.isPublished = isPublished;
    await product.save();

    return {
      id: product._id.toString(),
      name: product.name,
      isPublished: product.isPublished,
    };
  }

  /**
   * Delete product and all its Cloudinary assets
   */
  static async deleteProduct(id: string) {
    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found.`);
    }

    // Clean up all Cloudinary images
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.publicId) {
          try {
            await deleteCloudinaryImage(img.publicId);
          } catch (err) {
            logger.warn(`Failed to cleanup Cloudinary asset ${img.publicId} during product deletion:`, err);
          }
        }
      }
    }

    await Product.findByIdAndDelete(product._id);

    return {
      deleted: true,
      id: product._id.toString(),
      name: product.name,
    };
  }

  /**
   * Format product object with computed properties
   */
  private static formatProduct(item: any) {
    const primaryImg =
      (item.images || []).find((img: any) => img.isPrimary)?.url ||
      (item.images || [])[0]?.url ||
      '';

    const discountPercentage =
      item.mrp && item.mrp > item.sellingPrice
        ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100)
        : 0;

    const inStock = Boolean(item.isAvailable && item.stockQuantity > 0);
    const isLowStock = Boolean(inStock && item.stockQuantity <= (item.lowStockThreshold ?? 5));

    return {
      id: item._id.toString(),
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      brand: item.brand || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      categoryId: item.categoryId?._id ? item.categoryId._id.toString() : item.categoryId?.toString() || '',
      categoryName: item.categoryId?.name || '',
      subcategoryId: item.subcategoryId?._id
        ? item.subcategoryId._id.toString()
        : item.subcategoryId
        ? item.subcategoryId.toString()
        : null,
      subcategoryName: item.subcategoryId?.name || '',
      unit: item.unit || 'piece',
      packSize: item.packSize || '',
      mrp: item.mrp ?? 0,
      sellingPrice: item.sellingPrice,
      discountPercentage,
      stockQuantity: item.stockQuantity ?? 0,
      lowStockThreshold: item.lowStockThreshold ?? 5,
      isAvailable: item.isAvailable ?? true,
      isPublished: item.isPublished ?? true,
      isFeatured: item.isFeatured ?? false,
      isNewArrival: item.isNewArrival ?? false,
      isBestseller: item.isBestseller ?? false,
      inStock,
      isLowStock,
      tags: item.tags || [],
      images: item.images || [],
      imageUrl: primaryImg, // Primary image for easy customer UI access
      variants: item.variants || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
