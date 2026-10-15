import mongoose from 'mongoose';
import { Product } from '../../models/product.model';
import { Cart } from '../../models/cart.model';
import { LEGACY_MOCK_PRODUCT_MAP } from '../orders/order.service';

export interface CartItemInput {
  productId: string;
  quantity: number;
  variantName?: string;
}

export interface ValidatedCartItem {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  unit: string;
  packSize: string;
  sellingPrice: number;
  mrp: number;
  requestedQuantity: number;
  validQuantity: number;
  availableStock: number;
  lineSubtotal: number;
  lineMrpTotal: number;
  status: 'valid' | 'adjusted' | 'out_of_stock' | 'unavailable';
  message?: string;
}

export class CartService {
  /**
   * Validate cart items against live MongoDB inventory and prices
   */
  static async validateCart(items: CartItemInput[]) {
    // 1. Group & deduplicate items by productId
    const grouped = new Map<string, { quantity: number; variantName?: string }>();
    for (const item of items) {
      const resolvedId = LEGACY_MOCK_PRODUCT_MAP[item.productId] || item.productId;
      if (!mongoose.Types.ObjectId.isValid(resolvedId)) continue;
      const key = resolvedId;
      const current = grouped.get(key) || { quantity: 0, variantName: item.variantName };
      current.quantity += item.quantity;
      grouped.set(key, current);
    }

    const validatedItems: ValidatedCartItem[] = [];
    let subtotal = 0;
    let totalMrp = 0;
    let totalQuantity = 0;
    let hasAdjustments = false;

    for (const [productId, data] of grouped.entries()) {
      const product = await Product.findById(productId).lean();

      // Check if product exists and is published
      if (!product || !product.isPublished) {
        hasAdjustments = true;
        validatedItems.push({
          productId,
          name: product?.name || 'Unavailable Item',
          brand: product?.brand || '',
          imageUrl: product?.images?.[0]?.url || '',
          unit: product?.unit || 'piece',
          packSize: product?.packSize || '',
          sellingPrice: product?.sellingPrice || 0,
          mrp: product?.mrp || 0,
          requestedQuantity: data.quantity,
          validQuantity: 0,
          availableStock: 0,
          lineSubtotal: 0,
          lineMrpTotal: 0,
          status: 'unavailable',
          message: 'This product is no longer available in our store catalog.',
        });
        continue;
      }

      const primaryImg =
        (product.images || []).find((img) => img.isPrimary)?.url ||
        (product.images || [])[0]?.url ||
        '';

      const inStock = Boolean(product.isAvailable && product.stockQuantity > 0);

      // Check out of stock
      if (!inStock) {
        hasAdjustments = true;
        validatedItems.push({
          productId,
          name: product.name,
          brand: product.brand || '',
          imageUrl: primaryImg,
          unit: product.unit,
          packSize: product.packSize || '',
          sellingPrice: product.sellingPrice,
          mrp: product.mrp || 0,
          requestedQuantity: data.quantity,
          validQuantity: 0,
          availableStock: 0,
          lineSubtotal: 0,
          lineMrpTotal: 0,
          status: 'out_of_stock',
          message: 'Currently out of stock.',
        });
        continue;
      }

      // Check stock limit
      let validQuantity = data.quantity;
      let status: 'valid' | 'adjusted' = 'valid';
      let message: string | undefined;

      if (validQuantity > product.stockQuantity) {
        hasAdjustments = true;
        status = 'adjusted';
        validQuantity = product.stockQuantity;
        message = `Quantity limited to ${product.stockQuantity} due to available stock.`;
      }

      const lineSubtotal = validQuantity * product.sellingPrice;
      const lineMrpTotal = validQuantity * (product.mrp && product.mrp > 0 ? product.mrp : product.sellingPrice);

      subtotal += lineSubtotal;
      totalMrp += lineMrpTotal;
      totalQuantity += validQuantity;

      validatedItems.push({
        productId,
        name: product.name,
        brand: product.brand || '',
        imageUrl: primaryImg,
        unit: product.unit,
        packSize: product.packSize || '',
        sellingPrice: product.sellingPrice,
        mrp: product.mrp || 0,
        requestedQuantity: data.quantity,
        validQuantity,
        availableStock: product.stockQuantity,
        lineSubtotal,
        lineMrpTotal,
        status,
        message,
      });
    }

    const deliveryFee = 0; // In-store pickup counter orders (free handling)
    const savings = totalMrp > subtotal ? totalMrp - subtotal : 0;
    const isValid = validatedItems.length > 0 && !hasAdjustments && validatedItems.every((i) => i.validQuantity > 0);

    return {
      isValid,
      hasAdjustments,
      items: validatedItems,
      subtotal,
      totalMrp,
      savings,
      deliveryFee,
      totalToPay: subtotal + deliveryFee,
      itemCount: totalQuantity,
    };
  }

  /**
   * Get user's saved cart
   */
  static async getCart(userId: string) {
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        isValid: true,
        hasAdjustments: false,
        items: [],
        subtotal: 0,
        totalMrp: 0,
        savings: 0,
        deliveryFee: 0,
        totalToPay: 0,
        itemCount: 0,
      };
    }

    const itemsInput: CartItemInput[] = cart.items.map((i) => ({
      productId: i.productId.toString(),
      quantity: i.quantity,
      variantName: i.variantName,
    }));

    return this.validateCart(itemsInput);
  }

  /**
   * Sync and persist user cart
   */
  static async syncCart(userId: string, items: CartItemInput[]) {
    const validated = await this.validateCart(items);

    const validDbItems = validated.items
      .filter((i) => i.validQuantity > 0)
      .map((i) => ({
        productId: new mongoose.Types.ObjectId(i.productId),
        quantity: i.validQuantity,
      }));

    await Cart.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { items: validDbItems },
      { upsert: true, new: true }
    );

    return validated;
  }

  /**
   * Clear user's saved cart
   */
  static async clearCart(userId: string) {
    await Cart.findOneAndDelete({ userId });
    return {
      cleared: true,
      items: [],
      subtotal: 0,
      itemCount: 0,
    };
  }
}
