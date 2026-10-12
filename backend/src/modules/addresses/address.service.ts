import mongoose from 'mongoose';
import { Address, IAddress } from '../../models/address.model';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';

export interface AddressInput {
  name: string;
  phone: string;
  houseNumber: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export class AddressService {
  /**
   * Retrieves all saved addresses belonging to a specific user
   */
  static async getUserAddresses(userId: string): Promise<any[]> {
    return Address.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  }

  /**
   * Saves a new address for the authenticated user
   */
  static async createAddress(userId: string, input: AddressInput): Promise<IAddress> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Validate Indian phone number format
    const cleanPhone = (input.phone || '').trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new BadRequestError('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
    }

    // Validate 6-digit Indian PIN code
    const cleanPincode = (input.pincode || '').trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      throw new BadRequestError('Invalid Indian PIN code. Must be 6 digits.');
    }

    if (!input.name?.trim() || !input.houseNumber?.trim() || !input.street?.trim() || !input.city?.trim() || !input.state?.trim()) {
      throw new BadRequestError('Name, house number, street, city, and state are required.');
    }

    // If marked default, unset default on other addresses of this user
    if (input.isDefault) {
      await Address.updateMany({ userId: userObjectId }, { isDefault: false });
    } else {
      // If user has no addresses yet, make this first address default
      const count = await Address.countDocuments({ userId: userObjectId });
      if (count === 0) {
        input.isDefault = true;
      }
    }

    const created = await Address.create({
      userId: userObjectId,
      name: input.name.trim(),
      phone: cleanPhone,
      houseNumber: input.houseNumber.trim(),
      street: input.street.trim(),
      landmark: input.landmark?.trim() || '',
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: cleanPincode,
      deliveryInstructions: input.deliveryInstructions?.trim() || '',
      isDefault: Boolean(input.isDefault),
    });

    return created;
  }

  /**
   * Updates an existing address with object-level ownership verification
   */
  static async updateAddress(userId: string, addressId: string, input: Partial<AddressInput>): Promise<IAddress> {
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new BadRequestError('Invalid address ID format.');
    }

    const address = await Address.findById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }

    // Enforce object-level authorization
    if (address.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to modify this address.');
    }

    if (input.phone) {
      const cleanPhone = input.phone.trim();
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new BadRequestError('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
      }
      address.phone = cleanPhone;
    }

    if (input.pincode) {
      const cleanPincode = input.pincode.trim();
      if (!/^\d{6}$/.test(cleanPincode)) {
        throw new BadRequestError('Invalid Indian PIN code. Must be 6 digits.');
      }
      address.pincode = cleanPincode;
    }

    if (input.name) address.name = input.name.trim();
    if (input.houseNumber) address.houseNumber = input.houseNumber.trim();
    if (input.street) address.street = input.street.trim();
    if (input.landmark !== undefined) address.landmark = input.landmark.trim();
    if (input.city) address.city = input.city.trim();
    if (input.state) address.state = input.state.trim();
    if (input.deliveryInstructions !== undefined) address.deliveryInstructions = input.deliveryInstructions.trim();

    if (input.isDefault) {
      await Address.updateMany({ userId: address.userId }, { isDefault: false });
      address.isDefault = true;
    }

    await address.save();
    return address;
  }

  /**
   * Deletes an address with object-level ownership verification
   */
  static async deleteAddress(userId: string, addressId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new BadRequestError('Invalid address ID format.');
    }

    const address = await Address.findById(addressId);
    if (!address) {
      throw new NotFoundError('Address not found.');
    }

    // Enforce object-level authorization
    if (address.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to delete this address.');
    }

    await Address.findByIdAndDelete(addressId);
  }
}
