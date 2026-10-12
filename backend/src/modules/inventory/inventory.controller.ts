import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = {
      id: req.user!.id,
      email: req.user!.email,
      name: (req.user as any).name || 'Store Administrator',
    };

    // Check header for idempotency key if not in body
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
    const result = await InventoryService.adjustStock(
      {
        ...req.body,
        idempotencyKey,
      },
      user
    );

    sendSuccess(res, result, 'Stock adjustment recorded successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function reconcileStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = {
      id: req.user!.id,
      email: req.user!.email,
      name: (req.user as any).name || 'Store Administrator',
    };

    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
    const result = await InventoryService.reconcileStock(
      {
        ...req.body,
        idempotencyKey,
      },
      user
    );

    sendSuccess(res, result, 'Stock reconciliation completed successfully');
  } catch (error) {
    next(error);
  }
}

export async function getInventorySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await InventoryService.getInventorySummary();
    sendSuccess(res, summary, 'Inventory summary retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as any;
    const result = await InventoryService.listMovements({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      productId: query.productId,
      adjustmentType: query.adjustmentType,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    sendSuccess(res, result, 'Stock movement history retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getProductMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const query = req.query as any;
    const result = await InventoryService.listMovements({
      productId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      adjustmentType: query.adjustmentType,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    sendSuccess(res, result, 'Product movement history retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getLowStockReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await InventoryService.getLowStockReport();
    sendSuccess(res, items, 'Low stock report retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getExpiryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const daysThreshold = req.query.daysThreshold ? Number(req.query.daysThreshold) : 30;
    const items = await InventoryService.getExpiryReport(daysThreshold);
    sendSuccess(res, items, 'Expiry report retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as any;
    const result = await InventoryService.listAlerts({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      status: query.status,
      alertType: query.alertType,
    });

    sendSuccess(res, result, 'Inventory alerts retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = {
      id: req.user!.id,
      email: req.user!.email,
      name: (req.user as any).name || 'Store Administrator',
    };

    const alert = await InventoryService.acknowledgeAlert(id, user);
    sendSuccess(res, alert, 'Inventory alert acknowledged');
  } catch (error) {
    next(error);
  }
}

export async function resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const alert = await InventoryService.resolveAlert(id);
    sendSuccess(res, alert, 'Inventory alert resolved');
  } catch (error) {
    next(error);
  }
}
