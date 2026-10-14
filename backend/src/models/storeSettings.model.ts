import mongoose, { Document, Schema, Model } from 'mongoose';
import { env } from '../config/env';

export interface IStoreSettings extends Document {
  storeName: string;
  storePhone: string;
  storeWhatsapp: string;
  storeUpiId: string;
  storeAddress: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportHours?: string;
  operatingHours?: string;
  isPickupEnabled: boolean;
  pickupInstructions: string;
  isDeliveryEnabled: boolean;
  serviceablePincodes: string[];
  minOrderValue: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryWindow: string;
  isCodEnabled: boolean;
  isWhatsappQrEnabled: boolean;
  paymentInstructions?: string;
  orderPolicies?: string;
  adminOrderAlertsEnabled: boolean;
  lowStockAlertsEnabled: boolean;
  customerStatusNotificationsEnabled: boolean;
  invoicePrefix: string;
  gstin?: string;
  fssai?: string;
  pan?: string;
  stateName?: string;
  stateCode?: string;
  taxDetails?: string;
  currency: string;
  currencySymbol: string;
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    storeName: {
      type: String,
      required: true,
      default: env.STORE_NAME,
    },
    storePhone: {
      type: String,
      required: true,
      default: env.STORE_PHONE,
    },
    storeWhatsapp: {
      type: String,
      required: true,
      default: env.STORE_WHATSAPP,
    },
    storeUpiId: {
      type: String,
      required: true,
      default: env.STORE_UPI_ID,
    },
    storeAddress: {
      type: String,
      required: true,
      default: 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: 'support@kanhaiyageneralstore.com',
    },
    supportPhone: {
      type: String,
      default: env.STORE_PHONE,
    },
    supportHours: {
      type: String,
      default: '8:00 AM - 9:00 PM (Daily)',
    },
    operatingHours: {
      type: String,
      default: '8:00 AM - 9:30 PM (Mon - Sun)',
    },
    isPickupEnabled: {
      type: Boolean,
      default: true,
    },
    pickupInstructions: {
      type: String,
      required: true,
      default:
        'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
    },
    isDeliveryEnabled: {
      type: Boolean,
      default: false,
    },
    serviceablePincodes: {
      type: [String],
      default: ['209304', '209305', '208001', '208002'],
    },
    minOrderValue: {
      type: Number,
      default: 100,
    },
    standardDeliveryFee: {
      type: Number,
      default: 30,
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 500,
    },
    estimatedDeliveryWindow: {
      type: String,
      default: 'Same-day delivery within 2-4 hours',
    },
    isCodEnabled: {
      type: Boolean,
      default: true,
    },
    isWhatsappQrEnabled: {
      type: Boolean,
      default: false,
    },
    paymentInstructions: {
      type: String,
      default: 'Scan QR with any UPI app (GPay, PhonePe, Paytm) and share screenshot on WhatsApp.',
    },
    orderPolicies: {
      type: String,
      default: 'Dairy & bakery items non-returnable. Grocery returns accepted within 24 hours of delivery.',
    },
    adminOrderAlertsEnabled: {
      type: Boolean,
      default: true,
    },
    lowStockAlertsEnabled: {
      type: Boolean,
      default: true,
    },
    customerStatusNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    gstin: {
      type: String,
      default: '09ANBPL4077E1Z1',
    },
    fssai: {
      type: String,
      default: '12722046000057',
    },
    pan: {
      type: String,
      default: 'ANBPL4077E',
    },
    stateName: {
      type: String,
      default: 'Uttar Pradesh',
    },
    stateCode: {
      type: String,
      default: '09',
    },
    taxDetails: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
  },
  {
    timestamps: true,
  }
);

export const StoreSettings: Model<IStoreSettings> =
  mongoose.models.StoreSettings ||
  mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
