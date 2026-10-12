import mongoose from 'mongoose';
import { Category, ICategory } from '../../models/category.model';
import { Product } from '../../models/product.model';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { slugify } from '../../utils/slugify';
import { deleteCloudinaryImage } from '../../config/cloudinary';
import { logger } from '../../utils/logger';

export interface ListCategoriesFilter {
  search?: string;
  parentId?: string | null;
  includeInactive?: boolean;
}

export class CategoryService {
  /**
   * List categories with live product count
   */
  static async listCategories(filter: ListCategoriesFilter = {}) {
    const matchStage: Record<string, any> = {};

    if (!filter.includeInactive) {
      matchStage.isActive = true;
    }

    if (filter.search) {
      matchStage.name = { $regex: filter.search, $options: 'i' };
    }

    if (filter.parentId !== undefined) {
      if (filter.parentId === null || filter.parentId === 'null' || filter.parentId === '') {
        matchStage.parentId = null;
      } else if (mongoose.Types.ObjectId.isValid(filter.parentId)) {
        matchStage.parentId = new mongoose.Types.ObjectId(filter.parentId);
      }
    }

    const categories = await Category.aggregate([
      { $match: matchStage },
      { $sort: { displayOrder: 1, name: 1 } },
      {
        $lookup: {
          from: 'products',
          let: { catId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$categoryId', '$$catId'] },
                    { $eq: ['$subcategoryId', '$$catId'] },
                  ],
                },
              },
            },
          ],
          as: 'matchedProducts',
        },
      },
      {
        $addFields: {
          productCount: { $size: '$matchedProducts' },
        },
      },
      {
        $project: {
          matchedProducts: 0,
        },
      },
    ]);

    return categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      imagePublicId: cat.imagePublicId || '',
      displayOrder: cat.displayOrder ?? 0,
      isActive: cat.isActive ?? true,
      parentId: cat.parentId ? cat.parentId.toString() : null,
      productCount: cat.productCount ?? 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  /**
   * Get single category by ID or slug
   */
  static async getCategoryByIdOrSlug(idOrSlug: string, includeInactive = false) {
    const query: Record<string, any> = {};
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query._id = new mongoose.Types.ObjectId(idOrSlug);
    } else {
      query.slug = idOrSlug.toLowerCase();
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const category = await Category.findOne(query).populate('parentId', 'name slug');
    if (!category) {
      throw new NotFoundError(`Category '${idOrSlug}' not found.`);
    }

    const productCount = await Product.countDocuments({
      $or: [{ categoryId: category._id }, { subcategoryId: category._id }],
    });

    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      imagePublicId: category.imagePublicId || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      parentId: category.parentId ? (category.parentId as any)._id?.toString() || category.parentId.toString() : null,
      parent: category.parentId,
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Create category
   */
  static async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    imagePublicId?: string;
    displayOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
  }) {
    let finalSlug = data.slug ? slugify(data.slug) : slugify(data.name);
    
    // Check slug collision
    const existingSlug = await Category.findOne({ slug: finalSlug });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    if (data.parentId) {
      const parentExists = await Category.findById(data.parentId);
      if (!parentExists) {
        throw new BadRequestError(`Parent category with ID ${data.parentId} does not exist.`);
      }
    }

    const category = await Category.create({
      name: data.name,
      slug: finalSlug,
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      imagePublicId: data.imagePublicId || '',
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      parentId: data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
    });

    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      imagePublicId: category.imagePublicId,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      parentId: category.parentId ? category.parentId.toString() : null,
      productCount: 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Update category
   */
  static async updateCategory(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      imagePublicId?: string;
      displayOrder?: number;
      isActive?: boolean;
      parentId?: string | null;
    }
  ) {
    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found.`);
    }

    if (data.name) category.name = data.name;

    if (data.slug) {
      const newSlug = slugify(data.slug);
      if (newSlug !== category.slug) {
        const slugExists = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
        if (slugExists) {
          throw new BadRequestError(`Category slug '${newSlug}' is already in use.`);
        }
        category.slug = newSlug;
      }
    }

    if (data.description !== undefined) category.description = data.description;
    if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    if (data.parentId !== undefined) {
      if (data.parentId && data.parentId.toString() === category._id.toString()) {
        throw new BadRequestError('A category cannot be its own parent.');
      }
      if (data.parentId) {
        const parent = await Category.findById(data.parentId);
        if (!parent) {
          throw new BadRequestError(`Parent category with ID ${data.parentId} does not exist.`);
        }
        category.parentId = new mongoose.Types.ObjectId(data.parentId);
      } else {
        category.parentId = null;
      }
    }

    // Image replacement cleanup
    if (data.imagePublicId !== undefined && data.imagePublicId !== category.imagePublicId) {
      if (category.imagePublicId) {
        try {
          await deleteCloudinaryImage(category.imagePublicId);
        } catch (err) {
          logger.warn(`Failed to cleanup replaced Cloudinary image ${category.imagePublicId}:`, err);
        }
      }
      category.imagePublicId = data.imagePublicId;
      category.imageUrl = data.imageUrl || '';
    } else if (data.imageUrl !== undefined) {
      category.imageUrl = data.imageUrl;
    }

    await category.save();

    const productCount = await Product.countDocuments({
      $or: [{ categoryId: category._id }, { subcategoryId: category._id }],
    });

    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      imagePublicId: category.imagePublicId,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      parentId: category.parentId ? category.parentId.toString() : null,
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Delete category with safety checks and Cloudinary cleanup
   */
  static async deleteCategory(id: string) {
    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found.`);
    }

    // 1. Check for dependent products
    const productCount = await Product.countDocuments({
      $or: [{ categoryId: category._id }, { subcategoryId: category._id }],
    });

    if (productCount > 0) {
      throw new BadRequestError(
        `Cannot delete category '${category.name}' because ${productCount} product(s) still belong to it. Please reassign or delete these products first.`
      );
    }

    // 2. Check for child categories
    const childCount = await Category.countDocuments({ parentId: category._id });
    if (childCount > 0) {
      throw new BadRequestError(
        `Cannot delete category '${category.name}' because ${childCount} subcategory(s) depend on it. Please reassign or remove subcategories first.`
      );
    }

    // 3. Clean up Cloudinary asset
    if (category.imagePublicId) {
      try {
        await deleteCloudinaryImage(category.imagePublicId);
      } catch (err) {
        logger.warn(`Failed to delete Cloudinary asset ${category.imagePublicId} during category deletion:`, err);
      }
    }

    await Category.findByIdAndDelete(category._id);

    return {
      deleted: true,
      id: category._id.toString(),
      name: category.name,
    };
  }
}
