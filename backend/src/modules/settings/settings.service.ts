import { StoreSettings, IStoreSettings } from '../../models/storeSettings.model';
import { env } from '../../config/env';

export interface ServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  isDeliveryEnabled: boolean;
  estimatedDeliveryWindow: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderValue: number;
  message: string;
}

export class SettingsService {
  /**
   * Retrieves active store settings from database or fallback configuration
   */
  static async getSettings(): Promise<IStoreSettings> {
    try {
      let settings = await StoreSettings.findOne();
      if (!settings) {
        settings = await StoreSettings.create({
          storeName: env.STORE_NAME,
          storePhone: env.STORE_PHONE,
          storeWhatsapp: env.STORE_WHATSAPP,
          storeUpiId: env.STORE_UPI_ID,
          storeAddress: 'Fatehpur Roshnai, Kanpur D. UP',
          logoUrl: '',
          supportEmail: 'kanhaiyaastore@gmail.com',
          supportPhone: env.STORE_PHONE,
          supportHours: '8:00 AM - 9:00 PM (Daily)',
          operatingHours: '8:00 AM - 9:30 PM (Mon - Sun)',
          isPickupEnabled: true,
          pickupInstructions:
            'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
          isDeliveryEnabled: true,
          serviceablePincodes: ['110001', '110002', '110003', '110006', '110084'],
          minOrderValue: 100,
          standardDeliveryFee: 30,
          freeDeliveryThreshold: 500,
          estimatedDeliveryWindow: 'Same-day delivery within 2-4 hours',
          isCodEnabled: true,
          isWhatsappQrEnabled: true,
          paymentInstructions: 'Scan QR with any UPI app (GPay, PhonePe, Paytm) and share screenshot on WhatsApp.',
          orderPolicies: 'Dairy & bakery items non-returnable. Grocery returns accepted within 24 hours of delivery.',
          adminOrderAlertsEnabled: true,
          lowStockAlertsEnabled: true,
          customerStatusNotificationsEnabled: true,
          invoicePrefix: 'INV',
          gstin: '',
          taxDetails: '',
          currency: 'INR',
          currencySymbol: '₹',
        });
      }
      return settings;
    } catch {
      // In-memory fallback if database query fails or in mock test environment
      return {
        storeName: env.STORE_NAME,
        storePhone: env.STORE_PHONE,
        storeWhatsapp: env.STORE_WHATSAPP,
        storeUpiId: env.STORE_UPI_ID,
        storeAddress: 'Fatehpur Roshnai, Kanpur D. UP',
        logoUrl: '',
        supportEmail: 'kanhaiyaastore@gmail.com',
        supportPhone: env.STORE_PHONE,
        supportHours: '8:00 AM - 9:00 PM (Daily)',
        operatingHours: '8:00 AM - 9:30 PM (Mon - Sun)',
        isPickupEnabled: true,
        pickupInstructions:
          'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
        isDeliveryEnabled: true,
        serviceablePincodes: ['110001', '110002', '110003', '110006', '110084'],
        minOrderValue: 100,
        standardDeliveryFee: 30,
        freeDeliveryThreshold: 500,
        estimatedDeliveryWindow: 'Same-day delivery within 2-4 hours',
        isCodEnabled: true,
        isWhatsappQrEnabled: true,
        paymentInstructions: 'Scan QR with any UPI app (GPay, PhonePe, Paytm) and share screenshot on WhatsApp.',
        orderPolicies: 'Dairy & bakery items non-returnable. Grocery returns accepted within 24 hours of delivery.',
        adminOrderAlertsEnabled: true,
        lowStockAlertsEnabled: true,
        customerStatusNotificationsEnabled: true,
        invoicePrefix: 'INV',
        gstin: '',
        taxDetails: '',
        currency: 'INR',
        currencySymbol: '₹',
      } as unknown as IStoreSettings;
    }
  }

  /**
   * Updates store settings with administrator authorization
   */
  static async updateSettings(updates: Partial<IStoreSettings>): Promise<IStoreSettings> {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      await this.getSettings();
      settings = await StoreSettings.findOne();
    }
    if (!settings) {
      throw new Error('Unable to initialize store settings for update');
    }

    // Apply allowed updates
    const allowedKeys: (keyof IStoreSettings)[] = [
      'storeName',
      'storePhone',
      'storeWhatsapp',
      'storeUpiId',
      'storeAddress',
      'logoUrl',
      'supportEmail',
      'supportPhone',
      'supportHours',
      'operatingHours',
      'isPickupEnabled',
      'pickupInstructions',
      'isDeliveryEnabled',
      'serviceablePincodes',
      'minOrderValue',
      'standardDeliveryFee',
      'freeDeliveryThreshold',
      'estimatedDeliveryWindow',
      'isCodEnabled',
      'isWhatsappQrEnabled',
      'paymentInstructions',
      'orderPolicies',
      'adminOrderAlertsEnabled',
      'lowStockAlertsEnabled',
      'customerStatusNotificationsEnabled',
      'invoicePrefix',
      'gstin',
      'taxDetails',
      'currency',
      'currencySymbol',
    ];

    for (const key of allowedKeys) {
      if (key in updates && updates[key] !== undefined) {
        (settings as any)[key] = updates[key];
      }
    }

    await settings.save();
    return settings;
  }

  /**
   * Validates PIN code against configured delivery service areas
   */
  static async checkServiceability(
    pincode: string,
    subtotal: number = 0
  ): Promise<ServiceabilityResult> {
    const settings = await this.getSettings();
    const cleanPin = (pincode || '').trim();

    if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
      return {
        serviceable: false,
        pincode: cleanPin,
        isDeliveryEnabled: settings.isDeliveryEnabled,
        estimatedDeliveryWindow: settings.estimatedDeliveryWindow,
        deliveryFee: settings.standardDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        minOrderValue: settings.minOrderValue,
        message: 'Invalid Indian PIN code format. Must be 6 digits.',
      };
    }

    if (!settings.isDeliveryEnabled) {
      return {
        serviceable: false,
        pincode: cleanPin,
        isDeliveryEnabled: false,
        estimatedDeliveryWindow: 'Currently Unavailable',
        deliveryFee: 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        minOrderValue: settings.minOrderValue,
        message: 'Local delivery service is currently paused. Store pickup is available.',
      };
    }

    const isMatch = settings.serviceablePincodes.includes(cleanPin);
    const fee =
      subtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee;

    if (!isMatch) {
      return {
        serviceable: false,
        pincode: cleanPin,
        isDeliveryEnabled: true,
        estimatedDeliveryWindow: 'Not Serviceable',
        deliveryFee: settings.standardDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        minOrderValue: settings.minOrderValue,
        message: `Delivery is currently not available for PIN ${cleanPin}. You can choose In-Store Pickup.`,
      };
    }

    return {
      serviceable: true,
      pincode: cleanPin,
      isDeliveryEnabled: true,
      estimatedDeliveryWindow: settings.estimatedDeliveryWindow,
      deliveryFee: fee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      minOrderValue: settings.minOrderValue,
      message: `Delivery available in PIN ${cleanPin}. ${
        fee === 0 ? 'Eligible for FREE Delivery!' : `Delivery fee ₹${fee}`
      }`,
    };
  }
}
