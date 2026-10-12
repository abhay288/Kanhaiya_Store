import { Request, Response, NextFunction } from 'express';
import { CartService } from './cart.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function validateCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = req.body;
    const result = await CartService.validateCart(items || []);
    sendSuccess(res, result, 'Cart validated successfully');
  } catch (error) {
    next(error);
  }
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendSuccess(res, { items: [], subtotal: 0, itemCount: 0 }, 'Cart retrieved');
      return;
    }
    const result = await CartService.getCart(userId);
    sendSuccess(res, result, 'Cart retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function syncCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // For guests, validate only
      const result = await CartService.validateCart(req.body.items || []);
      sendSuccess(res, result, 'Guest cart validated');
      return;
    }
    const result = await CartService.syncCart(userId, req.body.items || []);
    sendSuccess(res, result, 'Cart synchronized successfully');
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (userId) {
      await CartService.clearCart(userId);
    }
    sendSuccess(res, { cleared: true, items: [], subtotal: 0, itemCount: 0 }, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
}
