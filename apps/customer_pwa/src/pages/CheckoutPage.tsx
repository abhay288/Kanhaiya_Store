import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Banknote,
  Truck,
  Store,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { repository } from '../api/productRepository';
import { apiClient } from '../api/client';
import {
  CustomerAddress,
  StorePublicSettings,
  ServiceabilityResult,
  OrderConfirmation,
} from '../types';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderCompleted: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderCompleted }) => {
  const { cart, subtotal, clearCart } = useCart();

  // Settings & user state
  const [settings, setSettings] = useState<StorePublicSettings | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  // Quick Login State for unauthenticated customers
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Fulfillment & Form State
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Kanpur');
  const [state, setState] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('209303');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);

  // Serviceability check
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WHATSAPP_QR'>('COD');

  // Submission & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderConfirmation | null>(null);
  const [idempotencyKey] = useState<string>(() => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  });

  // Load initial settings and user info
  useEffect(() => {
    const userToken = apiClient.getToken();
    setToken(userToken);

    // Fetch store configuration
    repository.getStoreSettings().then((s) => {
      setSettings(s);
      if (!s.isDeliveryEnabled) {
        setFulfillmentMethod('PICKUP');
      }
    });

    // If authenticated, prefill profile and fetch saved addresses
    if (userToken) {
      apiClient.getMe().then((res) => {
        if (res.data?.user) {
          if (res.data.user.displayName) setCustomerName(res.data.user.displayName);
          if (res.data.user.email) setCustomerEmail(res.data.user.email);
          if (res.data.user.phoneNumber) setCustomerPhone(res.data.user.phoneNumber);
        }
      }).catch(() => {});

      repository.getAddresses(userToken).then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) {
          setSelectedAddressId(def.id);
          applySavedAddress(def);
        }
      });
    }
  }, []);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loginPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setLoginError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await apiClient.quickLogin(clean, loginName.trim() || undefined);
      if (res.data?.token) {
        setToken(res.data.token);
        setCustomerPhone(clean);
        if (res.data.user?.displayName) {
          setCustomerName(res.data.user.displayName);
        } else if (loginName.trim()) {
          setCustomerName(loginName.trim());
        }
        if (res.data.user?.email) {
          setCustomerEmail(res.data.user.email);
        }
        repository.getAddresses(res.data.token).then((addrs) => {
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          if (def) {
            setSelectedAddressId(def.id);
            applySavedAddress(def);
          }
        });
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check connection and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check serviceability when pincode or subtotal changes
  useEffect(() => {
    if (fulfillmentMethod === 'DELIVERY' && pincode.length === 6) {
      setIsCheckingPin(true);
      repository.checkServiceability(pincode, subtotal)
        .then((res) => {
          setServiceability(res);
          setIsCheckingPin(false);
        })
        .catch(() => {
          setIsCheckingPin(false);
        });
    } else {
      setServiceability(null);
    }
  }, [pincode, fulfillmentMethod, subtotal]);

  const applySavedAddress = (addr: CustomerAddress) => {
    setCustomerName(addr.name);
    setCustomerPhone(addr.phone);
    setHouseNumber(addr.houseNumber);
    setStreet(addr.street);
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setDeliveryInstructions(addr.deliveryInstructions || '');
  };

  const handleSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setHouseNumber('');
      setStreet('');
      setLandmark('');
      setDeliveryInstructions('');
    } else {
      const found = savedAddresses.find((a) => a.id === id);
      if (found) applySavedAddress(found);
    }
  };

  const handleDeleteSavedAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const ok = await repository.deleteAddress(token, id);
    if (ok) {
      const remaining = savedAddresses.filter((a) => a.id !== id);
      setSavedAddresses(remaining);
      if (selectedAddressId === id) {
        setSelectedAddressId('new');
      }
    }
  };

  // Calculations
  const deliveryFee =
    fulfillmentMethod === 'PICKUP'
      ? 0
      : subtotal >= (settings?.freeDeliveryThreshold ?? 500)
      ? 0
      : (settings?.standardDeliveryFee ?? 30);

  const finalTotal = subtotal + deliveryFee;

  const validateForm = (): string | null => {
    if (!customerName.trim() || customerName.trim().length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    if (fulfillmentMethod === 'DELIVERY') {
      if (!houseNumber.trim()) return 'Please enter your House/Flat number.';
      if (!street.trim()) return 'Please enter your Street or Locality.';
      if (!city.trim()) return 'Please enter your City.';
      if (!state.trim()) return 'Please enter your State.';
      if (!/^\d{6}$/.test(pincode.trim())) {
        return 'Please enter a valid 6-digit Indian PIN code.';
      }
      if (serviceability && !serviceability.serviceable) {
        return serviceability.message || `Delivery is not available in PIN code ${pincode}. Choose In-Store Pickup.`;
      }
    }

    if (settings && subtotal < settings.minOrderValue) {
      return `Minimum order subtotal is ₹${settings.minOrderValue}. Your current subtotal is ₹${subtotal}.`;
    }

    return null;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Sync phone and name to Mongo profile
      if (token && customerPhone.trim()) {
        apiClient.updateProfile({ phoneNumber: customerPhone.trim(), displayName: customerName.trim() }).catch(() => {});
      }

      // If user opted to save address
      if (token && selectedAddressId === 'new' && saveAddressForFuture && fulfillmentMethod === 'DELIVERY') {
        try {
          await repository.createAddress(token, {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            houseNumber: houseNumber.trim(),
            street: street.trim(),
            landmark: landmark.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            deliveryInstructions: deliveryInstructions.trim(),
            isDefault: savedAddresses.length === 0,
          });
        } catch {
          // ignore address save failure, proceed with order
        }
      }

      const orderPayload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        fulfillmentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryAddress:
          fulfillmentMethod === 'DELIVERY'
            ? {
                houseNumber: houseNumber.trim(),
                street: street.trim(),
                landmark: landmark.trim() || undefined,
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                deliveryInstructions: deliveryInstructions.trim() || undefined,
              }
            : undefined,
        paymentMethod,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
      };

      const result = await repository.createOrder(orderPayload, token || undefined);
      setConfirmedOrder(result);
      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place your order. Please review details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER CONFIRMATION VIEW
  if (confirmedOrder) {
    return (
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            textAlign: 'center',
            backgroundColor: '#ffffff',
            padding: '24px 20px',
            borderRadius: 'var(--radius-lg, 16px)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.06))',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#DCE7DE', color: '#174D3A', marginBottom: '12px' }}>
            <CheckCircle2 size={44} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#174D3A', marginBottom: '4px' }}>
            Order Placed Successfully!
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
            Thank you for shopping with Kanhaiya General Store.
          </p>

          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '20px',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '0.5px',
            }}
          >
            Order #{confirmedOrder.orderNumber}
          </div>
        </div>

        {/* Payment Notice / WhatsApp Action */}
        {confirmedOrder.paymentMethod === 'WHATSAPP_QR' ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md, 12px)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
              <QrCode size={20} />
              WhatsApp QR Payment (Pending Store Verification)
            </div>
            <p style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.45, marginBottom: '12px' }}>
              Your order is recorded as <strong>PENDING</strong>. Click below to contact our store on WhatsApp. We will send you our verified UPI QR code. Send back the screenshot after payment so our staff can prepare your order!
            </p>
            {confirmedOrder.whatsappPaymentUrl && (
              <a
                href={confirmedOrder.whatsappPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                <span>Open WhatsApp & Request QR</span>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 'var(--radius-md, 12px)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
              <Banknote size={18} />
              Cash on Delivery (Payment Status: PENDING)
            </div>
            <p style={{ fontSize: '0.8rem', color: '#047857', margin: 0 }}>
              Payment is due upon {confirmedOrder.fulfillmentMethod === 'DELIVERY' ? 'delivery to your doorstep' : 'collection at the store counter'}. Please keep ₹{confirmedOrder.totalAmount} ready in cash or UPI.
            </p>
          </div>
        )}

        {/* Order Details Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: '#174D3A' }}>
            Fulfillment & Delivery Details
          </h3>
          <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ color: '#64748b' }}>Fulfillment Method: </span>
              <strong>{confirmedOrder.fulfillmentMethod === 'DELIVERY' ? 'Local Delivery' : 'In-Store Pickup'}</strong>
            </div>

            {confirmedOrder.fulfillmentMethod === 'DELIVERY' && confirmedOrder.deliveryAddress && (
              <div>
                <span style={{ color: '#64748b' }}>Delivery Address: </span>
                <div>
                  {confirmedOrder.deliveryAddress.houseNumber}, {confirmedOrder.deliveryAddress.street}
                  {confirmedOrder.deliveryAddress.landmark ? `, Near ${confirmedOrder.deliveryAddress.landmark}` : ''}
                </div>
                <div>
                  {confirmedOrder.deliveryAddress.city}, {confirmedOrder.deliveryAddress.state} - {confirmedOrder.deliveryAddress.pincode}
                </div>
              </div>
            )}

            {confirmedOrder.fulfillmentMethod === 'PICKUP' && confirmedOrder.pickupDetails && (
              <div>
                <span style={{ color: '#64748b' }}>Pickup Counter: </span>
                <div><strong>{confirmedOrder.pickupDetails.storeName}</strong></div>
                <div>{confirmedOrder.pickupDetails.storeAddress}</div>
                <div style={{ color: '#174D3A', marginTop: '4px' }}>{confirmedOrder.pickupDetails.pickupInstructions}</div>
              </div>
            )}

            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#64748b' }}>Customer: </span>
              <strong>{confirmedOrder.customerName}</strong> ({confirmedOrder.customerPhone})
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '14px', paddingTop: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Items Ordered:</div>
            {confirmedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span>
                  {item.quantity}x {item.name} {item.packSize ? `(${item.packSize})` : ''}
                </span>
                <span style={{ fontWeight: 600 }}>₹{item.lineSubtotal}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed var(--border)', marginTop: '12px', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Items Subtotal:</span>
              <span>₹{confirmedOrder.subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Delivery Charge:</span>
              <span>{confirmedOrder.deliveryFee === 0 ? 'FREE' : `₹${confirmedOrder.deliveryFee}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#174D3A' }}>
              <span>Total Payable:</span>
              <span>₹{confirmedOrder.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onOrderCompleted}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#174D3A',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md, 8px)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  // Require login before checkout
  if (!token) {
    return (
      <div style={{ padding: '16px', maxWidth: '460px', margin: '0 auto', paddingBottom: '90px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main, #262B29)',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={18} /> Back to Cart
        </button>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '24px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#DCE7DE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldCheck size={32} color="#174D3A" />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#174D3A', marginBottom: '8px' }}>
            Login to Place Your Order
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.45 }}>
            Please enter your mobile number. If you don't have an account, we will create one automatically. If you already have an account, you will be logged right in.
          </p>

          {loginError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.82rem',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleQuickLogin} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#174D3A', display: 'block', marginBottom: '4px' }}>
                Contact Mobile Number *
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile"
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#174D3A', display: 'block', marginBottom: '4px' }}>
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || loginPhone.length < 10}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#174D3A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: loginPhone.length < 10 || isLoggingIn ? 'not-allowed' : 'pointer',
                opacity: loginPhone.length < 10 || isLoggingIn ? 0.6 : 1,
                marginTop: '6px',
              }}
            >
              {isLoggingIn ? 'Logging in...' : 'Continue to Checkout →'}
            </button>
          </form>

          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8' }}>
            🔒 Instant login • All data secured with MongoDB Atlas
          </div>
        </div>
      </div>
    );
  }

  // CHECKOUT FORM
  return (
    <div style={{ padding: '16px', maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-main, #262B29)',
          cursor: 'pointer',
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '14px',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={18} /> Back to Cart
      </button>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#174D3A', marginBottom: '16px' }}>
        Checkout & Order Placement
      </h1>

      {errorMsg && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md, 8px)',
            color: '#b91c1c',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handlePlaceOrder}>
        {/* 1. Fulfillment Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
            1. Fulfillment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setFulfillmentMethod('DELIVERY')}
              disabled={settings ? !settings.isDeliveryEnabled : false}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '14px 10px',
                borderRadius: 'var(--radius-md, 10px)',
                border: fulfillmentMethod === 'DELIVERY' ? '2px solid #174D3A' : '1px solid var(--border)',
                backgroundColor: fulfillmentMethod === 'DELIVERY' ? '#DCE7DE' : '#ffffff',
                cursor: settings?.isDeliveryEnabled ? 'pointer' : 'not-allowed',
                opacity: settings?.isDeliveryEnabled ? 1 : 0.6,
              }}
            >
              <Truck size={22} color="#174D3A" />
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#174D3A' }}>Local Delivery</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {subtotal >= (settings?.freeDeliveryThreshold ?? 500) ? 'FREE (Orders > ₹500)' : '₹30 standard fee'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFulfillmentMethod('PICKUP')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '14px 10px',
                borderRadius: 'var(--radius-md, 10px)',
                border: fulfillmentMethod === 'PICKUP' ? '2px solid #174D3A' : '1px solid var(--border)',
                backgroundColor: fulfillmentMethod === 'PICKUP' ? '#DCE7DE' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <Store size={22} color="#174D3A" />
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#174D3A' }}>Store Pickup</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Counter pickup • ₹0 fee</div>
            </button>
          </div>
        </div>

        {/* 2. Customer Contact Details */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#174D3A', marginBottom: '12px' }}>
            2. Customer Contact Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Abhay Kushwaha"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit (e.g. 9876543210)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="For order receipts"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* 3. Address or Pickup Location */}
        {fulfillmentMethod === 'DELIVERY' ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#174D3A' }}>
                3. Delivery Address
              </div>
            </div>

            {/* Saved addresses selector for logged in customer */}
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                  Choose from saved addresses:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectSavedAddress(addr.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selectedAddressId === addr.id ? '2px solid #174D3A' : '1px solid var(--border)',
                        backgroundColor: selectedAddressId === addr.id ? '#DCE7DE' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem' }}>
                        <strong>{addr.name}</strong> • {addr.houseNumber}, {addr.street}, {addr.city} ({addr.pincode})
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedAddress(addr.id, e)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleSelectSavedAddress('new')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: selectedAddressId === 'new' ? '2px solid #174D3A' : '1px dashed var(--border)',
                      backgroundColor: selectedAddressId === 'new' ? '#DCE7DE' : 'transparent',
                      color: '#174D3A',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} /> Enter a New Delivery Address
                  </button>
                </div>
              </div>
            )}

            {/* Address fields */}
            {(savedAddresses.length === 0 || selectedAddressId === 'new') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      House / Flat No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="e.g. 42 / Flat 3B"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      Street / Locality *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. Main Bazar"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near City Post Office"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      PIN Code (6 digits) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 110001"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      City / Town *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                {token && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={saveAddressForFuture}
                      onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                    />
                    Save this address to my account for future orders
                  </label>
                )}
              </div>
            )}

            {/* Serviceability Status Badge */}
            {pincode.length === 6 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isCheckingPin
                    ? '#f1f5f9'
                    : serviceability?.serviceable
                    ? '#ecfdf5'
                    : '#fef2f2',
                  color: isCheckingPin
                    ? '#475569'
                    : serviceability?.serviceable
                    ? '#065f46'
                    : '#991b1b',
                }}
              >
                {isCheckingPin ? (
                  <span>Checking delivery availability...</span>
                ) : serviceability?.serviceable ? (
                  <span>
                    ✓ PIN {pincode} is serviceable! Estimated delivery: {serviceability.estimatedDeliveryWindow}
                  </span>
                ) : (
                  <span>
                    ✕ PIN {pincode} is not currently serviceable for delivery. Please choose In-Store Pickup.
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 12px)',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#174D3A', fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px' }}>
              <Store size={20} />
              Store Pickup Counter
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
              <div><strong>{settings?.storeName || 'Kanhaiya General Store'}</strong></div>
              <div>{settings?.storeAddress || 'House 42, Main Bazar, Near City Post Office, New Delhi - 110001'}</div>
              <div style={{ color: '#174D3A', fontWeight: 600, marginTop: '6px' }}>
                Instructions: {settings?.pickupInstructions || 'Orders are packed and kept ready at the store counter. Share your Order Number when collecting.'}
              </div>
            </div>
          </div>
        )}

        {/* 4. Payment Method Selection */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#174D3A', marginBottom: '12px' }}>
            4. Payment Method
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* COD */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: paymentMethod === 'COD' ? '2px solid #174D3A' : '1px solid var(--border)',
                backgroundColor: paymentMethod === 'COD' ? '#DCE7DE' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
              />
              <Banknote size={22} color="#174D3A" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#174D3A' }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Pay cash or UPI upon delivery / counter pickup. Status remains PENDING until fulfilled.
                </div>
              </div>
            </label>

            {/* Manual WhatsApp QR */}
            {settings?.isWhatsappQrEnabled && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: paymentMethod === 'WHATSAPP_QR' ? '2px solid #174D3A' : '1px solid var(--border)',
                  backgroundColor: paymentMethod === 'WHATSAPP_QR' ? '#DCE7DE' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'WHATSAPP_QR'}
                  onChange={() => setPaymentMethod('WHATSAPP_QR')}
                />
                <QrCode size={22} color="#174D3A" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#174D3A' }}>
                    Manual WhatsApp QR Payment
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Order created as PENDING. Request QR on store WhatsApp and share payment screenshot.
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Optional Customer Instructions */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#174D3A', display: 'block', marginBottom: '6px' }}>
            Special Instructions / Delivery Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="e.g. Please ring doorbell twice, or leave at reception"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* 5. Order Review & Breakdown */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#174D3A', marginBottom: '12px' }}>
            5. Price Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>Items Subtotal:</span>
            <span>₹{subtotal}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span style={{ color: '#64748b' }}>Delivery Fee:</span>
            <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#174D3A',
            }}
          >
            <span>Total Payable:</span>
            <span>₹{finalTotal}</span>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#174D3A" />
            Backend authoritative recalculation applied on order creation.
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || cart.length === 0}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#174D3A',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md, 10px)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(23,77,58,0.25)',
          }}
        >
          {isSubmitting ? 'Placing Order Authoritatively...' : `Confirm & Place Order (₹${finalTotal})`}
        </button>
      </form>
    </div>
  );
};
