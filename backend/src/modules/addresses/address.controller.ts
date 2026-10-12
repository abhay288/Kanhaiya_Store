import { Request, Response, NextFunction } from 'express';
import { AddressService } from './address.service';
import { sendSuccess } from '../../utils/apiResponse';

export class AddressController {
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await AddressService.getUserAddresses(req.user!.id);
      return sendSuccess(res, addresses, 'Customer saved addresses retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.createAddress(req.user!.id, req.body);
      return sendSuccess(res, address, 'Address saved successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.updateAddress(req.user!.id, req.params.id, req.body);
      return sendSuccess(res, address, 'Address updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      await AddressService.deleteAddress(req.user!.id, req.params.id);
      return sendSuccess(res, { id: req.params.id }, 'Address deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
