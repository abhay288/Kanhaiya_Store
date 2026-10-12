import { Schema, model, Document, Types } from 'mongoose';

export type InventoryAlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY';
export type InventoryAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface IInventoryAlert extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  alertType: InventoryAlertType;
  currentQuantity: number;
  threshold: number;
  status: InventoryAlertStatus;
  message: string;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryAlertSchema = new Schema<IInventoryAlert>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    alertType: {
      type: String,
      enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY'],
      required: true,
      index: true,
    },
    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    threshold: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InventoryAlertSchema.index({ product: 1, alertType: 1, status: 1 });
InventoryAlertSchema.index({ createdAt: -1 });

export const InventoryAlert = model<IInventoryAlert>('InventoryAlert', InventoryAlertSchema);
