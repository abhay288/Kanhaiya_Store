import { Router } from 'express';
import { AddressController } from './address.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', AddressController.getAddresses as any);
router.post('/', AddressController.createAddress as any);
router.put('/:id', AddressController.updateAddress as any);
router.delete('/:id', AddressController.deleteAddress as any);

export const addressRouter = router;
