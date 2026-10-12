import mongoose, { Types } from 'mongoose';
import { Product, IProduct } from '../../models/product.model';
import { StockMovement, IStockMovement, StockAdjustmentType } from '../../models/stockMovement.model';
import { InventoryAlert, IInventoryAlert } from '../../models/inventoryAlert.model';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export interface StockAdjustmentInput {
  productId: string;
  adjustmentType: StockAdjustmentType;
  quantity: number;
  reason: string;
  notes?: string;
  supplierName?: string;
  supplierInvoiceNumber?: string;
  batchNumber?: string;
  manufacturingDate?: Date | string;
  expiryDate?: Date | string;
  idempotencyKey?: string;
  allowNegativeStock?: boolean;
}

export interface StockReconciliationInput {
  productId: string;
  physicalCount: number;
  reason?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface ListMovementsFilter {
  page?: number;
  limit?: number;
  productId?: string;
  adjustmentType?: StockAdjustmentType;
  startDate?: string;
  endDate?: string;
}

export interface ListAlertsFilter {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  alertType?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY';
}

export interface AuthUserInfo {
  id: Types.ObjectId | string;
  email?: string;
  name?: string;
}

const INTEGER_UNITS = ['piece', 'packet', 'box', 'bottle'];

export class InventoryService {
  /**
   * Adjust stock atomically with movement tracking, idempotency, and alert management.
   */
  static async adjustStock(
    input: StockAdjustmentInput,
    user: AuthUserInfo
  ): Promise<{ movement: IStockMovement; product: IProduct }> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingMovement = await StockMovement.findOne({ idempotencyKey: input.idempotencyKey });
      if (existingMovement) {
        const product = await Product.findById(existingMovement.productId);
        if (!product) {
          throw new NotFoundError('Product associated with this idempotency key no longer exists');
        }
        return { movement: existingMovement, product };
      }
    }

    // 2. Fetch Product
    const product = await Product.findById(input.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // 3. Quantity formatting & unit validation
    let quantity = input.quantity;
    if (INTEGER_UNITS.includes(product.unit.toLowerCase())) {
      if (!Number.isInteger(quantity)) {
        throw new BadRequestError(`Quantity for unit ${product.unit} must be an integer.`);
      }
    } else {
      quantity = Math.round(quantity * 1000) / 1000;
    }

    // 4. Calculate delta
    const previousQuantity = product.stockQuantity;
    let changeQuantity = 0;

    switch (input.adjustmentType) {
      case 'OPENING_STOCK':
        if (previousQuantity === 0) {
          changeQuantity = quantity;
        } else {
          changeQuantity = quantity - previousQuantity;
        }
        break;
      case 'PURCHASE_RECEIPT':
      case 'MANUAL_INCREASE':
      case 'CUSTOMER_RETURN':
        changeQuantity = quantity;
        break;
      case 'MANUAL_DECREASE':
      case 'DAMAGED_EXPIRED':
      case 'ORDER_FULFILLMENT':
        changeQuantity = -quantity;
        break;
      case 'STOCK_CORRECTION':
      case 'RECONCILIATION':
        changeQuantity = quantity;
        break;
      default:
        throw new BadRequestError(`Unsupported adjustment type: ${input.adjustmentType}`);
    }

    const finalQuantity = Math.round((previousQuantity + changeQuantity) * 1000) / 1000;

    if (finalQuantity < 0 && !input.allowNegativeStock) {
      throw new BadRequestError(
        `Insufficient stock: current stock is ${previousQuantity} ${product.unit}, adjustment of ${changeQuantity} results in ${finalQuantity} ${product.unit}. Negative stock is not permitted.`
      );
    }

    // 5. Update fields
    const updateProductFields: Record<string, any> = {
      stockQuantity: finalQuantity,
      isAvailable: finalQuantity > 0,
      lastStockUpdateAt: new Date(),
      lastStockUpdatedBy: new Types.ObjectId(user.id.toString()),
    };

    if (input.batchNumber) updateProductFields.batchNumber = input.batchNumber;
    if (input.manufacturingDate) updateProductFields.manufacturingDate = new Date(input.manufacturingDate);
    if (input.expiryDate) updateProductFields.expiryDate = new Date(input.expiryDate);

    let session: mongoose.ClientSession | null = null;
    let savedMovement: IStockMovement;
    let updatedProduct: IProduct | null = null;

    try {
      // Try replica set transaction
      session = await mongoose.startSession();
      session.startTransaction();

      updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, stockQuantity: previousQuantity },
        { $set: updateProductFields },
        { new: true, session }
      );

      // If optimistic check failed (concurrent update)
      if (!updatedProduct) {
        const refetched = await Product.findById(product._id).session(session);
        if (!refetched) throw new NotFoundError('Product not found during transaction');
        
        const newPrevious = refetched.stockQuantity;
        const newFinal = Math.round((newPrevious + changeQuantity) * 1000) / 1000;
        if (newFinal < 0 && !input.allowNegativeStock) {
          throw new BadRequestError('Concurrent update resulted in insufficient stock.');
        }

        updateProductFields.stockQuantity = newFinal;
        updateProductFields.isAvailable = newFinal > 0;

        updatedProduct = await Product.findByIdAndUpdate(
          product._id,
          { $set: updateProductFields },
          { new: true, session }
        );
      }

      const movementDocs = await StockMovement.create(
        [
          {
            productId: product._id,
            previousQuantity,
            changeQuantity,
            finalQuantity: updatedProduct!.stockQuantity,
            adjustmentType: input.adjustmentType,
            reason: input.reason,
            referenceNumber: input.supplierInvoiceNumber || input.notes || '',
            batchNumber: input.batchNumber || product.batchNumber || '',
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : product.expiryDate,
            idempotencyKey: input.idempotencyKey,
            performedBy: new Types.ObjectId(user.id.toString()),
            performerName: user.name || 'Store Administrator',
            performerEmail: user.email || 'admin@kanhaiyastore.com',
          },
        ],
        { session }
      );
      savedMovement = movementDocs[0];

      await session.commitTransaction();
    } catch (transactionError: any) {
      if (session) {
        await session.abortTransaction().catch(() => {});
      }

      // If standalone MongoDB instance (no replica set configured)
      if (
        transactionError?.message?.includes('replica set') ||
        transactionError?.message?.includes('Transaction numbers are only allowed')
      ) {
        updatedProduct = await Product.findByIdAndUpdate(
          product._id,
          { $set: updateProductFields },
          { new: true }
        );

        if (!updatedProduct) {
          throw new NotFoundError('Product failed to update');
        }

        savedMovement = await StockMovement.create({
          productId: product._id,
          previousQuantity,
          changeQuantity,
          finalQuantity: updatedProduct.stockQuantity,
          adjustmentType: input.adjustmentType,
          reason: input.reason,
          referenceNumber: input.supplierInvoiceNumber || input.notes || '',
          batchNumber: input.batchNumber || product.batchNumber || '',
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : product.expiryDate,
          idempotencyKey: input.idempotencyKey,
          performedBy: new Types.ObjectId(user.id.toString()),
          performerName: user.name || 'Store Administrator',
          performerEmail: user.email || 'admin@kanhaiyastore.com',
        });
      } else {
        throw transactionError;
      }
    } finally {
      if (session) {
        await session.endSession().catch(() => {});
      }
    }

    // 6. Update or trigger Inventory Alerts
    await this.syncAlertsForProduct(updatedProduct!);

    return {
      movement: savedMovement,
      product: updatedProduct!,
    };
  }

  /**
   * Reconcile stock after physical count
   */
  static async reconcileStock(
    input: StockReconciliationInput,
    user: AuthUserInfo
  ): Promise<{ movement: IStockMovement; product: IProduct }> {
    const product = await Product.findById(input.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const previousQuantity = product.stockQuantity;
    const physicalCount = INTEGER_UNITS.includes(product.unit.toLowerCase())
      ? Math.round(input.physicalCount)
      : Math.round(input.physicalCount * 1000) / 1000;

    const delta = Math.round((physicalCount - previousQuantity) * 1000) / 1000;

    return this.adjustStock(
      {
        productId: input.productId,
        adjustmentType: 'RECONCILIATION',
        quantity: delta,
        reason: input.reason || `Physical audit count adjusted from ${previousQuantity} to ${physicalCount} ${product.unit}`,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
        allowNegativeStock: false,
      },
      user
    );
  }

  /**
   * Trigger or resolve alerts based on current stock
   */
  static async syncAlertsForProduct(product: IProduct): Promise<void> {
    try {
      const { _id: productId, stockQuantity, lowStockThreshold, name, unit } = product;

      if (stockQuantity <= 0) {
        // Resolve LOW_STOCK if any, trigger OUT_OF_STOCK
        await InventoryAlert.updateMany(
          { product: productId, alertType: 'LOW_STOCK', status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
          { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
        );

        const existingOutAlert = await InventoryAlert.findOne({
          product: productId,
          alertType: 'OUT_OF_STOCK',
          status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        });

        if (!existingOutAlert) {
          await InventoryAlert.create({
            product: productId,
            alertType: 'OUT_OF_STOCK',
            currentQuantity: stockQuantity,
            threshold: lowStockThreshold,
            status: 'ACTIVE',
            message: `Product "${name}" is OUT OF STOCK (0 ${unit} remaining).`,
          });
        }
      } else if (stockQuantity <= lowStockThreshold) {
        // Resolve OUT_OF_STOCK if any, trigger LOW_STOCK
        await InventoryAlert.updateMany(
          { product: productId, alertType: 'OUT_OF_STOCK', status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
          { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
        );

        const existingLowAlert = await InventoryAlert.findOne({
          product: productId,
          alertType: 'LOW_STOCK',
          status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
        });

        if (!existingLowAlert) {
          await InventoryAlert.create({
            product: productId,
            alertType: 'LOW_STOCK',
            currentQuantity: stockQuantity,
            threshold: lowStockThreshold,
            status: 'ACTIVE',
            message: `Product "${name}" is LOW ON STOCK (${stockQuantity} ${unit} remaining, threshold: ${lowStockThreshold}).`,
          });
        }
      } else {
        // Healthy stock -> automatically resolve all active stock alerts
        await InventoryAlert.updateMany(
          {
            product: productId,
            alertType: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
            status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
          { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
        );
      }
    } catch (error) {
      console.error('Failed to sync inventory alerts:', error);
    }
  }

  /**
   * Get overall inventory summary and KPIs
   */
  static async getInventorySummary(): Promise<Record<string, any>> {
    const totalProducts = await Product.countDocuments();
    const inStockCount = await Product.countDocuments({
      $expr: { $gt: ['$stockQuantity', '$lowStockThreshold'] },
    });
    const lowStockCount = await Product.countDocuments({
      stockQuantity: { $gt: 0 },
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    });
    const outOfStockCount = await Product.countDocuments({
      stockQuantity: { $lte: 0 },
    });

    const now = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoonCount = await Product.countDocuments({
      stockQuantity: { $gt: 0 },
      expiryDate: { $gte: now, $lte: thirtyDaysAhead },
    });

    const activeAlertsCount = await InventoryAlert.countDocuments({
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    });

    const recentMovements = await StockMovement.find()
      .populate('productId', 'name sku unit images')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      totalProducts,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      activeAlertsCount,
      recentMovements,
    };
  }

  /**
   * List paginated stock movements with filtering
   */
  static async listMovements(filter: ListMovementsFilter): Promise<{
    movements: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filter.productId) {
      query.productId = filter.productId;
    }
    if (filter.adjustmentType) {
      query.adjustmentType = filter.adjustmentType;
    }
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
      if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .populate('productId', 'name sku barcode unit images sellingPrice stockQuantity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    return {
      movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Low and out of stock report
   */
  static async getLowStockReport(): Promise<any[]> {
    return Product.find({
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    })
      .populate('categoryId', 'name slug')
      .sort({ stockQuantity: 1 })
      .lean();
  }

  /**
   * Products approaching expiry or expired
   */
  static async getExpiryReport(daysThreshold = 30): Promise<any[]> {
    const targetDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
    return Product.find({
      expiryDate: { $exists: true, $ne: null, $lte: targetDate },
      stockQuantity: { $gt: 0 },
    })
      .populate('categoryId', 'name slug')
      .sort({ expiryDate: 1 })
      .lean();
  }

  /**
   * List Inventory Alerts
   */
  static async listAlerts(filter: ListAlertsFilter): Promise<{
    alerts: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (filter.status) query.status = filter.status;
    if (filter.alertType) query.alertType = filter.alertType;

    const [alerts, total] = await Promise.all([
      InventoryAlert.find(query)
        .populate('product', 'name sku unit stockQuantity lowStockThreshold images')
        .populate('acknowledgedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryAlert.countDocuments(query),
    ]);

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string, user: AuthUserInfo): Promise<IInventoryAlert> {
    const alert = await InventoryAlert.findById(alertId);
    if (!alert) {
      throw new NotFoundError('Inventory alert not found');
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = new Types.ObjectId(user.id.toString());
    alert.acknowledgedAt = new Date();
    await alert.save();

    return alert;
  }

  /**
   * Manually resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<IInventoryAlert> {
    const alert = await InventoryAlert.findById(alertId);
    if (!alert) {
      throw new NotFoundError('Inventory alert not found');
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    await alert.save();

    return alert;
  }
}
