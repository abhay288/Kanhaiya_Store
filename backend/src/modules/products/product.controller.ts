import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const query = req.query as any;

    const result = await ProductService.listProducts({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
      categoryId: query.categoryId,
      subcategoryId: query.subcategoryId,
      tag: query.tag,
      brand: query.brand,
      isFeatured: query.isFeatured === undefined ? undefined : query.isFeatured === 'true',
      isNewArrival: query.isNewArrival === undefined ? undefined : query.isNewArrival === 'true',
      isBestseller: query.isBestseller === undefined ? undefined : query.isBestseller === 'true',
      inStock: query.inStock === undefined ? undefined : query.inStock === 'true',
      isPublished: query.isPublished === undefined ? undefined : query.isPublished === 'true',
      minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined,
      sort: query.sort,
      isAdmin,
    });

    sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getCollections(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const collections = await ProductService.getCollections();
    sendSuccess(res, collections, 'Store collections retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getRelatedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const items = await ProductService.getRelatedProducts(id, limit);
    sendSuccess(res, items, 'Related products retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { id } = req.params;
    const item = await ProductService.getProductByIdOrSlug(id, isAdmin);
    sendSuccess(res, item, 'Product details retrieved');
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await ProductService.createProduct(req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await ProductService.updateProduct(id, req.body);
    sendSuccess(res, updated, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function togglePublish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const updated = await ProductService.togglePublish(id, isPublished);
    sendSuccess(res, updated, `Product ${isPublished ? 'published' : 'unpublished'} successfully`);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await ProductService.deleteProduct(id);
    sendSuccess(res, result, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
}
