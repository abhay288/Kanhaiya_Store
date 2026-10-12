import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IAddress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  phone: string;
  houseNumber: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number.'],
    },
    houseNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'New Delhi',
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'Delhi',
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit Indian PIN code.'],
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AddressSchema.index({ userId: 1, isDefault: -1 });

export const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>('Address', AddressSchema);
