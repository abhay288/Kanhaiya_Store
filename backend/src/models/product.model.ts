import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export const PRODUCT_UNITS = [
  'piece',
  'packet',
  'box',
  'bottle',
  'kg',
  'g',
  'l',
  'ml',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface IProductImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface IProductVariant {
  name: string;
  value: string;
  price?: number;
  sku?: string;
  stockQuantity?: number;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  categoryId: Types.ObjectId;
  subcategoryId?: Types.ObjectId | null;
  unit: ProductUnit;
  packSize?: string;
  mrp?: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  tags: string[];
  images: IProductImage[];
  variants: IProductVariant[];
  reservedQuantity: number;
  batchNumber?: string;
  manufacturingDate?: Date;
  expiryDate?: Date;
  lastStockUpdateAt?: Date;
  lastStockUpdatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    price: { type: Number, min: 0 },
    sku: { type: String, trim: true },
    stockQuantity: { type: Number, min: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    unit: {
      type: String,
      enum: PRODUCT_UNITS,
      default: 'piece',
      required: true,
    },
    packSize: {
      type: String,
      trim: true,
      default: '',
    },
    mrp: {
      type: Number,
      min: 0,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer stock value',
      },
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    images: {
      type: [ProductImageSchema],
      default: [],
    },
    variants: {
      type: [ProductVariantSchema],
      default: [],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },
    manufacturingDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    lastStockUpdateAt: {
      type: Date,
      default: Date.now,
    },
    lastStockUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound and Search indexes
ProductSchema.index({ categoryId: 1, isPublished: 1, isAvailable: 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
