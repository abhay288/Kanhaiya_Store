import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type FulfillmentMethod = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'COD' | 'WHATSAPP_QR';
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IOrderAuditEntry {
  action: string;
  previousStatus?: string;
  newStatus?: string;
  previousPaymentStatus?: string;
  newPaymentStatus?: string;
  actorId?: Types.ObjectId | null;
  actorName?: string;
  actorRole?: string;
  timestamp: Date;
  reason?: string;
  notes?: string;
  transactionReference?: string;
}

export interface IOrderItemSnapshot {
  productId: Types.ObjectId;
  name: string;
  brand?: string;
  imageUrl?: string;
  unit: string;
  packSize?: string;
  sellingPrice: number;
  mrp: number;
  quantity: number;
  lineSubtotal: number;
}

export interface IDeliveryAddressSnapshot {
  name: string;
  phone: string;
  houseNumber: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryInstructions?: string;
}

export interface IPickupDetailsSnapshot {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  pickupInstructions: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  customerId?: Types.ObjectId | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress?: IDeliveryAddressSnapshot | null;
  pickupDetails?: IPickupDetailsSnapshot | null;
  items: IOrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerNotes?: string;
  idempotencyKey?: string;
  whatsappPaymentUrl?: string;
  guestTrackingToken?: string;
  invoiceNumber?: string;
  invoiceGeneratedAt?: Date;
  isInventoryRestored: boolean;
  cancelReason?: string;
  paymentReference?: string;
  paymentVerifiedAt?: Date;
  paymentVerifiedBy?: Types.ObjectId | null;
  statusHistory: IOrderAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    unit: {
      type: String,
      required: true,
      default: 'piece',
    },
    packSize: {
      type: String,
      default: '',
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const DeliveryAddressSnapshotSchema = new Schema<IDeliveryAddressSnapshot>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    houseNumber: { type: String, required: true },
    street: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    deliveryInstructions: { type: String, default: '' },
  },
  { _id: false }
);

const PickupDetailsSnapshotSchema = new Schema<IPickupDetailsSnapshot>(
  {
    storeName: { type: String, required: true },
    storeAddress: { type: String, required: true },
    storePhone: { type: String, required: true },
    pickupInstructions: { type: String, required: true },
  },
  { _id: false }
);

const OrderAuditEntrySchema = new Schema<IOrderAuditEntry>(
  {
    action: { type: String, required: true },
    previousStatus: { type: String },
    newStatus: { type: String },
    previousPaymentStatus: { type: String },
    newPaymentStatus: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'SYSTEM' },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    transactionReference: { type: String, default: '' },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    fulfillmentMethod: {
      type: String,
      enum: ['DELIVERY', 'PICKUP'],
      required: true,
    },
    deliveryAddress: {
      type: DeliveryAddressSnapshotSchema,
      default: null,
    },
    pickupDetails: {
      type: PickupDetailsSnapshotSchema,
      default: null,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(val: IOrderItemSnapshot[]) => val.length > 0, 'Order must contain at least one item.'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'WHATSAPP_QR'],
      required: true,
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: [
        'PENDING',
        'PAID',
        'FAILED',
        'REFUND_PENDING',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
      ],
      required: true,
      default: 'PENDING',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        'PLACED',
        'CONFIRMED',
        'PREPARING',
        'PACKED',
        'OUT_FOR_DELIVERY',
        'READY_FOR_PICKUP',
        'COMPLETED',
        'CANCELLED',
      ],
      required: true,
      default: 'PLACED',
      index: true,
    },
    customerNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    whatsappPaymentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    guestTrackingToken: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },
    isInventoryRestored: {
      type: Boolean,
      default: false,
    },
    cancelReason: {
      type: String,
      default: '',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    paymentVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusHistory: {
      type: [OrderAuditEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
OrderSchema.index({ guestTrackingToken: 1 }, { sparse: true });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
