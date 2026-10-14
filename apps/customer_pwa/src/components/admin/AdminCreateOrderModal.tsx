import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, X } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AdminCreateOrderModalProps {
  onClose: () => void;
  onOrderCreated: () => void;
  onToast: (type: 'success' | 'error', message: string) => void;
}

interface OrderItemInput {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProductItem {
  _id: string;
  name: string;
  sellingPrice?: number;
  price?: number;
}

export const AdminCreateOrderModal: React.FC<AdminCreateOrderModalProps> = ({
  onClose,
  onOrderCreated,
  onToast,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WHATSAPP_MANUAL'>('COD');
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PAID');
  const [notes, setNotes] = useState('In-Store POS / Walk-in Order');

  // Products selection
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await apiClient.getProducts({ limit: 100 });
      if (res.data?.items) {
        setAvailableProducts(res.data.items);
        if (res.data.items.length > 0) {
          setSelectedProductId(res.data.items[0]._id);
        }
      }
    } catch {
      // Products load optional
    }
  };

  const handleAddItem = () => {
    const prod = availableProducts.find((p: ProductItem) => p._id === selectedProductId);
    if (!prod) return;

    const existingIndex = orderItems.findIndex((it: OrderItemInput) => it.productId === prod._id);
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += selectedQuantity;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: prod._id,
          name: prod.name,
          price: prod.sellingPrice || prod.price || 0,
          quantity: selectedQuantity,
        },
      ]);
    }
    setSelectedQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_: OrderItemInput, i: number) => i !== index));
  };

  const totalAmount = orderItems.reduce((acc: number, it: OrderItemInput) => acc + it.price * it.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      onToast('error', 'Customer Phone number is required.');
      return;
    }
    if (orderItems.length === 0) {
      onToast('error', 'Please add at least 1 item to the order.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.createAdminOrder({
        customerName: customerName.trim() || 'Store Walk-in Customer',
        customerPhone: customerPhone.trim(),
        items: orderItems.map((it: OrderItemInput) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        fulfillmentType: 'STORE_PICKUP',
        paymentMethod,
        paymentStatus,
        orderStatus: paymentStatus === 'PAID' ? 'COMPLETED' : 'CONFIRMED',
        notes: notes.trim(),
      });

      onToast('success', `✅ Order created successfully for ${customerName || customerPhone}!`);
      onOrderCreated();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', `Failed to create order: ${e?.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          color: '#0f172a',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Create In-Store POS Order</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Customer Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Customer Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9936269347"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Add Item Section */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Select Product to Add</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  backgroundColor: '#fff',
                }}
              >
                {availableProducts.map((p: ProductItem) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (₹{p.sellingPrice || p.price})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '60px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  textAlign: 'center',
                }}
              />

              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Items Table */}
          {orderItems.length > 0 ? (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 40px',
                  padding: '6px 10px',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                }}
              >
                <span>Item</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span></span>
              </div>
              {orderItems.map((it: OrderItemInput, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 40px',
                    padding: '8px 10px',
                    borderTop: '1px solid #f1f5f9',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{it.name}</span>
                  <span style={{ textAlign: 'center' }}>{it.quantity}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700 }}>₹{it.price * it.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', textAlign: 'right' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px',
                  backgroundColor: '#f8fafc',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                }}
              >
                <span>Order Total:</span>
                <span style={{ color: 'var(--primary)' }}>₹{totalAmount}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>
              No items added yet. Select a product above.
            </div>
          )}

          {/* Payment Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  backgroundColor: '#fff',
                }}
              >
                <option value="COD">💵 Cash at Store</option>
                <option value="WHATSAPP_MANUAL">📲 WhatsApp UPI</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  backgroundColor: '#fff',
                }}
              >
                <option value="PAID">✅ PAID</option>
                <option value="PENDING">⏳ PENDING</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
              Order Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Walk-in customer, packed by cash counter"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontWeight: 800,
                cursor: submitting ? 'wait' : 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {submitting ? 'Creating Order in Database...' : `Create Order (₹${totalAmount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
