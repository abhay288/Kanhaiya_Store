import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export const STOCK_ADJUSTMENT_TYPES = [
  'OPENING_STOCK',
  'PURCHASE_RECEIPT',
  'MANUAL_INCREASE',
  'MANUAL_DECREASE',
  'DAMAGED_EXPIRED',
  'CUSTOMER_RETURN',
  'STOCK_CORRECTION',
  'RECONCILIATION',
  'ORDER_FULFILLMENT',
] as const;

export type StockAdjustmentType = (typeof STOCK_ADJUSTMENT_TYPES)[number];
export type StockMovementType = StockAdjustmentType;

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  previousQuantity: number;
  changeQuantity: number;
  finalQuantity: number;
  adjustmentType: StockAdjustmentType;
  reason: string;
  referenceNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
  idempotencyKey?: string;
  performedBy: Types.ObjectId;
  performerEmail?: string;
  performerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    changeQuantity: {
      type: Number,
      required: true,
    },
    finalQuantity: {
      type: Number,
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: STOCK_ADJUSTMENT_TYPES,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    expiryDate: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    performerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    performerName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ adjustmentType: 1, createdAt: -1 });

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
