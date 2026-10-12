import { Order, IOrder } from '../../models/order.model';
import { Product, IProduct } from '../../models/product.model';
import { User, IUser } from '../../models/user.model';
import { StockMovement } from '../../models/stockMovement.model';
import { Category } from '../../models/category.model';
import { calculateDateRange } from '../../utils/dateRange';
import { generateCsv } from '../../utils/csvExport';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export class AnalyticsService {
  /**
   * 1. Overview KPIs
   */
  static async getOverview(range?: string, startDate?: string, endDate?: string) {
    const dateRange = calculateDateRange(range, startDate, endDate);
    const { startDate: start, endDate: end } = dateRange;

    // Today's range in IST for "orders placed today"
    const todayRange = calculateDateRange('today');

    // Orders query for the selected range
    const ordersInRange = await Order.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    // Orders placed today
    const ordersTodayCount = await Order.countDocuments({
      createdAt: { $gte: todayRange.startDate, $lte: todayRange.endDate },
    });

    let grossOrderValue = 0;
    let verifiedPayments = 0;
    let pendingPayments = 0;
    let awaitingConfirmation = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    for (const ord of ordersInRange) {
      if (ord.orderStatus === 'CANCELLED') {
        cancelledOrders++;
      } else {
        grossOrderValue += ord.totalAmount || 0;
        if (ord.orderStatus === 'PLACED') awaitingConfirmation++;
        if (ord.orderStatus === 'COMPLETED') completedOrders++;

        if (ord.paymentStatus === 'PAID') {
          verifiedPayments += ord.totalAmount || 0;
        } else if (ord.paymentStatus === 'PENDING') {
          pendingPayments += ord.totalAmount || 0;
        }
      }
    }

    // Product stock KPIs
    const allProducts = await Product.find({ isPublished: true }).lean();
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const totalActiveProducts = allProducts.length;

    for (const p of allProducts) {
      const stock = p.stockQuantity || 0;
      const threshold = p.lowStockThreshold || 5;
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= threshold) {
        lowStockCount++;
      }
    }

    // Registered customer count
    const totalCustomers = await User.countDocuments({ role: 'CUSTOMER' });

    return {
      totalOrders: ordersInRange.length,
      ordersToday: ordersTodayCount,
      awaitingConfirmation,
      completedOrders,
      cancelledOrders,
      grossOrderValue: Math.round(grossOrderValue * 100) / 100,
      verifiedPayments: Math.round(verifiedPayments * 100) / 100,
      pendingPayments: Math.round(pendingPayments * 100) / 100,
      lowStockCount,
      outOfStockCount,
      totalActiveProducts,
      totalCustomers,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: dateRange.label,
      },
    };
  }

  /**
   * 2. Sales and Revenue Analytics
   */
  static async getSalesAnalytics(range?: string, startDate?: string, endDate?: string) {
    const dateRange = calculateDateRange(range, startDate, endDate);
    const { startDate: start, endDate: end } = dateRange;

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    let grossOrderValue = 0;
    let verifiedPayments = 0;
    let pendingPayments = 0;
    let refundTotal = 0;
    let eligibleOrdersCount = 0;

    const paymentMethods: Record<string, { count: number; amount: number }> = {
      COD: { count: 0, amount: 0 },
      WHATSAPP_QR: { count: 0, amount: 0 },
    };

    const fulfillmentMethods: Record<string, { count: number; amount: number }> = {
      DELIVERY: { count: 0, amount: 0 },
      PICKUP: { count: 0, amount: 0 },
    };

    const statusCounts: Record<string, number> = {
      PLACED: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      OUT_FOR_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    // Grouping by day for trend chart
    const timelineMap = new Map<string, { date: string; orderCount: number; grossValue: number; verifiedPayments: number; pendingPayments: number }>();

    for (const ord of orders) {
      const st = ord.orderStatus;
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      // Format date key (YYYY-MM-DD)
      const d = ord.createdAt.toISOString().slice(0, 10);
      if (!timelineMap.has(d)) {
        timelineMap.set(d, { date: d, orderCount: 0, grossValue: 0, verifiedPayments: 0, pendingPayments: 0 });
      }
      const dayStats = timelineMap.get(d)!;

      if (st !== 'CANCELLED') {
        eligibleOrdersCount++;
        const amt = ord.totalAmount || 0;
        grossOrderValue += amt;
        dayStats.orderCount++;
        dayStats.grossValue += amt;

        if (ord.paymentStatus === 'PAID') {
          verifiedPayments += amt;
          dayStats.verifiedPayments += amt;
        } else if (ord.paymentStatus === 'PENDING') {
          pendingPayments += amt;
          dayStats.pendingPayments += amt;
        }

        // Breakdown by payment method
        const pm = ord.paymentMethod || 'COD';
        if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, amount: 0 };
        paymentMethods[pm].count++;
        paymentMethods[pm].amount += amt;

        // Breakdown by fulfillment method
        const fm = ord.fulfillmentMethod || 'DELIVERY';
        if (!fulfillmentMethods[fm]) fulfillmentMethods[fm] = { count: 0, amount: 0 };
        fulfillmentMethods[fm].count++;
        fulfillmentMethods[fm].amount += amt;
      }

      if (ord.paymentStatus === 'REFUNDED' || ord.paymentStatus === 'PARTIALLY_REFUNDED') {
        refundTotal += ord.totalAmount || 0;
      }
    }

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      grossOrderValue: Math.round(grossOrderValue * 100) / 100,
      verifiedPayments: Math.round(verifiedPayments * 100) / 100,
      pendingPayments: Math.round(pendingPayments * 100) / 100,
      refundTotal: Math.round(refundTotal * 100) / 100,
      eligibleOrdersCount,
      averageOrderValue: eligibleOrdersCount > 0 ? Math.round((grossOrderValue / eligibleOrdersCount) * 100) / 100 : 0,
      paymentMethods,
      fulfillmentMethods,
      statusCounts,
      timeline,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: dateRange.label,
      },
    };
  }

  /**
   * 3. Product Performance Reports
   */
  static async getProductReports(range?: string, startDate?: string, endDate?: string, limit = 20, page = 1) {
    const dateRange = calculateDateRange(range, startDate, endDate);
    const { startDate: start, endDate: end } = dateRange;

    // Aggregate non-cancelled order items
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: 'CANCELLED' },
    }).lean();

    const productSalesMap = new Map<string, { productId: string; name: string; brand: string; quantitySold: number; totalRevenue: number; ordersCount: number }>();
    const categoryRevenueMap = new Map<string, number>();

    for (const ord of orders) {
      for (const it of ord.items || []) {
        const pId = it.productId ? it.productId.toString() : it.name;
        if (!productSalesMap.has(pId)) {
          productSalesMap.set(pId, {
            productId: pId,
            name: it.name,
            brand: it.brand || '',
            quantitySold: 0,
            totalRevenue: 0,
            ordersCount: 0,
          });
        }
        const record = productSalesMap.get(pId)!;
        record.quantitySold += it.quantity || 1;
        record.totalRevenue += it.lineSubtotal || 0;
        record.ordersCount++;
      }
    }

    // Join with catalog products to get real-time stock and identify zero-sales products
    const allProducts = await Product.find({ isPublished: true })
      .populate('categoryId', 'name')
      .lean();

    const enrichedProducts: any[] = [];
    const soldProductIds = new Set(Array.from(productSalesMap.keys()));

    for (const p of allProducts) {
      const pIdStr = p._id.toString();
      const catName = (p.categoryId as any)?.name || 'General';

      if (productSalesMap.has(pIdStr)) {
        const sale = productSalesMap.get(pIdStr)!;
        enrichedProducts.push({
          ...sale,
          categoryName: catName,
          currentStock: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
          sellingPrice: p.sellingPrice,
        });

        // Add to category revenue
        categoryRevenueMap.set(catName, (categoryRevenueMap.get(catName) || 0) + sale.totalRevenue);
      } else {
        // Zero-sales product
        enrichedProducts.push({
          productId: pIdStr,
          name: p.name,
          brand: p.brand || '',
          categoryName: catName,
          quantitySold: 0,
          totalRevenue: 0,
          ordersCount: 0,
          currentStock: p.stockQuantity,
          lowStockThreshold: p.lowStockThreshold,
          sellingPrice: p.sellingPrice,
        });
      }
    }

    // Rank by quantity sold desc
    enrichedProducts.sort((a, b) => b.quantitySold - a.quantitySold);

    const zeroSalesCount = enrichedProducts.filter((p) => p.quantitySold === 0).length;
    const bestsellers = enrichedProducts.slice(0, 5);

    // Paginated list
    const startIndex = (page - 1) * limit;
    const paginated = enrichedProducts.slice(startIndex, startIndex + limit);

    const categoryPerformance = Array.from(categoryRevenueMap.entries()).map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue * 100) / 100,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      products: paginated,
      bestsellers,
      zeroSalesCount,
      categoryPerformance,
      total: enrichedProducts.length,
      page,
      totalPages: Math.ceil(enrichedProducts.length / limit) || 1,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: dateRange.label,
      },
    };
  }

  /**
   * 4. Inventory Reports
   */
  static async getInventoryReports(range?: string, startDate?: string, endDate?: string) {
    const dateRange = calculateDateRange(range, startDate, endDate);
    const { startDate: start, endDate: end } = dateRange;

    // Real-time stock from Product collection
    const products = await Product.find({ isPublished: true })
      .populate('categoryId', 'name')
      .lean();

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const lowStockList: any[] = [];
    const outOfStockList: any[] = [];
    const replenishmentSuggestions: any[] = [];
    const expiryList: any[] = [];

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const p of products) {
      const stock = p.stockQuantity || 0;
      const threshold = p.lowStockThreshold || 5;
      const catName = (p.categoryId as any)?.name || 'General';

      if (stock <= 0) {
        outOfStockCount++;
        outOfStockList.push({
          id: p._id.toString(),
          name: p.name,
          category: catName,
          stock: 0,
          threshold,
        });
        replenishmentSuggestions.push({
          id: p._id.toString(),
          name: p.name,
          category: catName,
          currentStock: 0,
          threshold,
          suggestedReorder: threshold * 3, // Safe replenishment rule
        });
      } else if (stock <= threshold) {
        lowStockCount++;
        lowStockList.push({
          id: p._id.toString(),
          name: p.name,
          category: catName,
          stock,
          threshold,
        });
        replenishmentSuggestions.push({
          id: p._id.toString(),
          name: p.name,
          category: catName,
          currentStock: stock,
          threshold,
          suggestedReorder: threshold * 2,
        });
      } else {
        inStockCount++;
      }

      // Check expiry date if recorded
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        const isExpired = expDate < now;
        const isNearExpiry = !isExpired && expDate <= thirtyDaysFromNow;

        if (isExpired || isNearExpiry) {
          expiryList.push({
            id: p._id.toString(),
            name: p.name,
            batchNumber: p.batchNumber || 'N/A',
            stock,
            expiryDate: expDate.toISOString(),
            status: isExpired ? 'EXPIRED' : 'NEAR_EXPIRY',
          });
        }
      }
    }

    // Stock movements summary within range
    const movements = await StockMovement.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const movementSummary: Record<string, { count: number; totalQuantity: number }> = {
      RECEIPT: { count: 0, totalQuantity: 0 },
      DAMAGE: { count: 0, totalQuantity: 0 },
      SALE: { count: 0, totalQuantity: 0 },
      ADJUSTMENT: { count: 0, totalQuantity: 0 },
      INCREASE: { count: 0, totalQuantity: 0 },
      DECREASE: { count: 0, totalQuantity: 0 },
    };

    for (const m of movements) {
      const type = m.adjustmentType || 'ADJUSTMENT';
      if (!movementSummary[type]) movementSummary[type] = { count: 0, totalQuantity: 0 };
      movementSummary[type].count++;
      const qty = Math.abs((m as any).changeQuantity ?? (m as any).quantity ?? 0);
      movementSummary[type].totalQuantity += qty;
    }

    return {
      summary: {
        totalProducts: products.length,
        inStockCount,
        lowStockCount,
        outOfStockCount,
      },
      lowStockList,
      outOfStockList,
      replenishmentSuggestions,
      expiryList,
      movementSummary,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: dateRange.label,
      },
    };
  }

  /**
   * 5. Order & Payment Reports
   */
  static async getOrderReports(range?: string, startDate?: string, endDate?: string) {
    const dateRange = calculateDateRange(range, startDate, endDate);
    const { startDate: start, endDate: end } = dateRange;

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const statusCounts: Record<string, number> = {};
    const fulfillmentCounts: Record<string, number> = {};
    const paymentStatusCounts: Record<string, number> = {};

    let totalAmount = 0;
    let verifiedAmount = 0;
    let pendingCodAmount = 0;
    let pendingWhatsappQrAmount = 0;

    for (const o of orders) {
      statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
      fulfillmentCounts[o.fulfillmentMethod] = (fulfillmentCounts[o.fulfillmentMethod] || 0) + 1;
      paymentStatusCounts[o.paymentStatus] = (paymentStatusCounts[o.paymentStatus] || 0) + 1;

      if (o.orderStatus !== 'CANCELLED') {
        totalAmount += o.totalAmount || 0;
        if (o.paymentStatus === 'PAID') {
          verifiedAmount += o.totalAmount || 0;
        } else if (o.paymentStatus === 'PENDING') {
          if (o.paymentMethod === 'COD') {
            pendingCodAmount += o.totalAmount || 0;
          } else {
            pendingWhatsappQrAmount += o.totalAmount || 0;
          }
        }
      }
    }

    return {
      totalOrders: orders.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      verifiedAmount: Math.round(verifiedAmount * 100) / 100,
      pendingCodAmount: Math.round(pendingCodAmount * 100) / 100,
      pendingWhatsappQrAmount: Math.round(pendingWhatsappQrAmount * 100) / 100,
      statusCounts,
      fulfillmentCounts,
      paymentStatusCounts,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: dateRange.label,
      },
    };
  }

  /**
   * 6. Customer Management
   */
  static async getCustomers(search?: string, page = 1, limit = 20) {
    // 1. Fetch registered customers
    const userQuery: any = { role: 'CUSTOMER' };
    if (search && search.trim().length > 0) {
      const term = search.trim();
      userQuery.$or = [
        { displayName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    const registeredUsers = await User.find(userQuery).lean();

    // 2. Aggregate orders grouped by customerId or phone
    const customerOrders = await Order.find({
      orderStatus: { $ne: 'CANCELLED' },
    }).lean();

    const customerSpendMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();
    const phoneToUserMap = new Map<string, string>(); // Phone to userId

    for (const ord of customerOrders) {
      const key = ord.customerId ? ord.customerId.toString() : `phone:${ord.customerPhone}`;
      if (!customerSpendMap.has(key)) {
        customerSpendMap.set(key, { count: 0, spend: 0, lastOrder: ord.createdAt });
      }
      const stat = customerSpendMap.get(key)!;
      stat.count++;
      stat.spend += ord.totalAmount || 0;
      if (ord.createdAt > stat.lastOrder) {
        stat.lastOrder = ord.createdAt;
      }

      if (ord.customerId && ord.customerPhone) {
        phoneToUserMap.set(ord.customerPhone, ord.customerId.toString());
      }
    }

    // Build customer records
    const records: any[] = [];

    for (const u of registeredUsers) {
      const uId = u._id.toString();
      const stats = customerSpendMap.get(uId) || { count: 0, spend: 0, lastOrder: null };

      records.push({
        id: uId,
        name: u.displayName,
        email: u.email,
        phone: '', // Will be enriched from orders if present
        isRegistered: true,
        registeredAt: u.createdAt.toISOString(),
        orderCount: stats.count,
        totalSpend: Math.round(stats.spend * 100) / 100,
        lastOrderDate: stats.lastOrder ? stats.lastOrder.toISOString() : null,
      });
    }

    // Identify unique guest purchasers
    for (const [key, stats] of customerSpendMap.entries()) {
      if (key.startsWith('phone:')) {
        const phone = key.replace('phone:', '');
        if (!phoneToUserMap.has(phone)) {
          // If search is applied, filter phone or name
          if (search && search.trim().length > 0 && !phone.includes(search.trim())) {
            continue;
          }

          records.push({
            id: `guest_${phone}`,
            name: `Guest (${phone.slice(-4)})`,
            email: '',
            phone,
            isRegistered: false,
            registeredAt: null,
            orderCount: stats.count,
            totalSpend: Math.round(stats.spend * 100) / 100,
            lastOrderDate: stats.lastOrder ? stats.lastOrder.toISOString() : null,
          });
        }
      }
    }

    // Sort by total spend desc
    records.sort((a, b) => b.totalSpend - a.totalSpend);

    const startIndex = (page - 1) * limit;
    const paginated = records.slice(startIndex, startIndex + limit);

    return {
      customers: paginated,
      total: records.length,
      page,
      totalPages: Math.ceil(records.length / limit) || 1,
    };
  }

  /**
   * 7. Customer Profile & Order History Details
   */
  static async getCustomerDetails(idOrPhone: string) {
    let user: any = null;
    let orders: any[] = [];

    if (idOrPhone.startsWith('guest_')) {
      const phone = idOrPhone.replace('guest_', '');
      orders = await Order.find({ customerPhone: phone }).sort({ createdAt: -1 }).lean();
      return {
        customer: {
          id: idOrPhone,
          name: orders[0]?.customerName || 'Guest Shopper',
          phone,
          email: orders[0]?.customerEmail || '',
          isRegistered: false,
          registeredAt: null,
        },
        orders,
      };
    }

    // Check if it's an ObjectId for registered user
    try {
      user = await User.findById(idOrPhone).lean();
    } catch {
      // not objectid
    }

    if (user) {
      orders = await Order.find({ customerId: user._id }).sort({ createdAt: -1 }).lean();
      return {
        customer: {
          id: user._id.toString(),
          name: user.displayName,
          email: user.email,
          phone: orders[0]?.customerPhone || '',
          isRegistered: true,
          registeredAt: user.createdAt.toISOString(),
        },
        orders,
      };
    }

    // Try finding by phone directly
    orders = await Order.find({ customerPhone: idOrPhone }).sort({ createdAt: -1 }).lean();
    if (orders.length > 0) {
      return {
        customer: {
          id: `guest_${idOrPhone}`,
          name: orders[0].customerName,
          phone: idOrPhone,
          email: orders[0].customerEmail || '',
          isRegistered: false,
          registeredAt: null,
        },
        orders,
      };
    }

    throw new NotFoundError('Customer not found');
  }

  /**
   * 8. Export CSV Reports
   */
  static async exportReportCsv(reportType: string, range?: string, startDate?: string, endDate?: string) {
    const type = (reportType || 'sales').toLowerCase();

    switch (type) {
      case 'sales': {
        const data = await this.getSalesAnalytics(range, startDate, endDate);
        const headers = ['Date', 'Orders Count', 'Gross Order Value (INR)', 'Verified Payments (INR)', 'Pending Payments (INR)'];
        const rows = data.timeline.map((t) => [t.date, t.orderCount, t.grossValue, t.verifiedPayments, t.pendingPayments]);
        return {
          filename: `kgs-sales-report-${Date.now()}.csv`,
          csv: generateCsv(headers, rows),
        };
      }

      case 'orders': {
        const dateRange = calculateDateRange(range, startDate, endDate);
        const orders = await Order.find({
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        }).sort({ createdAt: -1 }).lean();

        const headers = [
          'Order Number',
          'Customer Name',
          'Customer Phone',
          'Date',
          'Fulfillment',
          'Payment Method',
          'Payment Status',
          'Order Status',
          'Items Count',
          'Total Amount (INR)',
        ];
        const rows = orders.map((o) => [
          o.orderNumber,
          o.customerName,
          o.customerPhone,
          o.createdAt.toISOString().slice(0, 19).replace('T', ' '),
          o.fulfillmentMethod,
          o.paymentMethod,
          o.paymentStatus,
          o.orderStatus,
          o.items?.length || 0,
          o.totalAmount,
        ]);
        return {
          filename: `kgs-orders-report-${Date.now()}.csv`,
          csv: generateCsv(headers, rows),
        };
      }

      case 'products': {
        const data = await this.getProductReports(range, startDate, endDate, 1000, 1);
        const headers = ['Product Name', 'Brand', 'Category', 'Selling Price (INR)', 'Units Sold', 'Total Revenue (INR)', 'Current Stock'];
        const rows = data.products.map((p: any) => [
          p.name,
          p.brand,
          p.categoryName,
          p.sellingPrice,
          p.quantitySold,
          p.totalRevenue,
          p.currentStock,
        ]);
        return {
          filename: `kgs-product-performance-${Date.now()}.csv`,
          csv: generateCsv(headers, rows),
        };
      }

      case 'inventory': {
        const data = await this.getInventoryReports(range, startDate, endDate);
        const headers = ['Type', 'Item Name', 'Category', 'Current Stock', 'Threshold', 'Suggested Reorder'];
        const rows: any[] = [];
        data.replenishmentSuggestions.forEach((p: any) => {
          rows.push(['LOW / OUT OF STOCK', p.name, p.category, p.currentStock, p.threshold, p.suggestedReorder]);
        });
        data.expiryList.forEach((e: any) => {
          rows.push([`EXPIRY: ${e.status}`, e.name, 'N/A', e.stock, 'N/A', e.batchNumber]);
        });
        return {
          filename: `kgs-inventory-report-${Date.now()}.csv`,
          csv: generateCsv(headers, rows),
        };
      }

      case 'customers': {
        const data = await this.getCustomers('', 1, 1000);
        const headers = ['Customer Name', 'Phone', 'Email', 'Type', 'Orders Placed', 'Total Spend (INR)', 'Last Order Date'];
        const rows = data.customers.map((c: any) => [
          c.name,
          c.phone,
          c.email,
          c.isRegistered ? 'Registered' : 'Guest',
          c.orderCount,
          c.totalSpend,
          c.lastOrderDate || 'None',
        ]);
        return {
          filename: `kgs-customer-report-${Date.now()}.csv`,
          csv: generateCsv(headers, rows),
        };
      }

      default:
        throw new BadRequestError(`Unsupported report export type: ${reportType}`);
    }
  }
}
