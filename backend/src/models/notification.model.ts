import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_DISPATCHED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_VERIFIED'
  | 'ADMIN_ALERT'
  | 'STORE_ANNOUNCEMENT';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  customerPhone?: string;
  orderId?: Types.ObjectId | null;
  orderNumber?: string;
  title: string;
  message: string;
  type: NotificationType;
  appName?: string;
  logoUrl?: string;
  isRead: boolean;
  isAdmin?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    orderNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_DISPATCHED',
        'ORDER_COMPLETED',
        'ORDER_CANCELLED',
        'PAYMENT_VERIFIED',
        'ADMIN_ALERT',
        'STORE_ANNOUNCEMENT',
      ],
      required: true,
    },
    appName: {
      type: String,
      default: 'Kanhaiya General Store',
    },
    logoUrl: {
      type: String,
      default: 'assets/images/kgs_logo.png',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ customerPhone: 1, createdAt: -1 });
NotificationSchema.index({ isAdmin: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
