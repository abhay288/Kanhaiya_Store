import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const includeInactive = req.query.includeInactive === 'true' && isAdmin;
    const parentId = req.query.parentId as string | undefined;
    const search = req.query.search as string | undefined;

    const items = await CategoryService.listCategories({
      search,
      parentId,
      includeInactive,
    });

    sendSuccess(res, items, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const { id } = req.params;
    const item = await CategoryService.getCategoryByIdOrSlug(id, isAdmin);
    sendSuccess(res, item, 'Category details retrieved');
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await CategoryService.createCategory(req.body);
    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await CategoryService.updateCategory(id, req.body);
    sendSuccess(res, updated, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await CategoryService.deleteCategory(id);
    sendSuccess(res, result, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
}
