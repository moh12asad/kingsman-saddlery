import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Helper function to round to 2 decimal places
const roundTo2Decimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Helper to parse date range from query params
const parseDateRange = (startDate, endDate) => {
  let start = null;
  let end = null;
  
  if (startDate) {
    start = admin.firestore.Timestamp.fromDate(new Date(startDate));
  }
  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999); // End of day
    end = admin.firestore.Timestamp.fromDate(endDateObj);
  }
  
  return { start, end };
};

// Helper to filter orders by date range
const filterOrdersByDate = (orders, start, end) => {
  return orders.filter(order => {
    if (!order.createdAt) return false;
    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (start && orderDate < start.toDate()) return false;
    if (end && orderDate > end.toDate()) return false;
    return true;
  });
};

// Helper to get product details
const getProductDetails = async (productId) => {
  try {
    const productDoc = await db.collection("products").doc(productId).get();
    if (productDoc.exists) {
      return productDoc.data();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return null;
  }
};

// All routes require authentication and ADMIN role
router.use(verifyFirebaseToken);
router.use(requireRole("ADMIN"));

// 1. Sales Overview Dashboard
router.get("/sales-overview", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders for revenue calculations
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Calculate metrics
    const totalRevenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    const totalOrders = activeOrders.length;
    const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
    const averageOrderValue = totalOrders > 0 ? roundTo2Decimals(totalRevenue / totalOrders) : 0;
    
    const totalSubtotal = activeOrders.reduce((sum, order) => sum + (Number(order.subtotal) || 0), 0);
    const totalTax = activeOrders.reduce((sum, order) => sum + (Number(order.tax) || 0), 0);
    const totalDiscounts = activeOrders.reduce((sum, order) => {
      const discount = order.discount?.amount || 0;
      return sum + Number(discount);
    }, 0);
    
    // Calculate delivery costs (estimated from metadata or calculate from total)
    const totalDeliveryCost = activeOrders.reduce((sum, order) => {
      const deliveryType = order.metadata?.deliveryType;
      if (deliveryType === "delivery") {
        // Estimate delivery cost from order total (subtotal + tax + delivery)
        // Delivery cost = total - subtotal - tax
        const delivery = (Number(order.total) || 0) - (Number(order.subtotal) || 0) - (Number(order.tax) || 0);
        return sum + Math.max(0, delivery);
      }
      return sum;
    }, 0);
    
    // Growth calculation (compare with previous period)
    let previousPeriodRevenue = 0;
    if (start && end) {
      const periodLength = end.toDate() - start.toDate();
      const previousStart = admin.firestore.Timestamp.fromDate(new Date(start.toDate().getTime() - periodLength));
      const previousEnd = admin.firestore.Timestamp.fromDate(new Date(start.toDate().getTime() - 1));
      
      const previousOrders = filterOrdersByDate(
        ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt
        })),
        previousStart,
        previousEnd
      ).filter(o => o.status !== "cancelled");
      
      previousPeriodRevenue = previousOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    }
    
    const revenueGrowth = previousPeriodRevenue > 0 
      ? roundTo2Decimals(((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100)
      : 0;
    
    res.json({
      totalRevenue: roundTo2Decimals(totalRevenue),
      totalOrders,
      cancelledOrders,
      averageOrderValue,
      totalSubtotal: roundTo2Decimals(totalSubtotal),
      totalTax: roundTo2Decimals(totalTax),
      totalDiscounts: roundTo2Decimals(totalDiscounts),
      totalDeliveryCost: roundTo2Decimals(totalDeliveryCost),
      revenueGrowth,
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching sales overview:", error);
    res.status(500).json({ error: "Failed to fetch sales overview", details: error.message });
  }
});

// 2. Best Sellers Report (Enhanced)
router.get("/best-sellers", async (req, res) => {
  try {
    const { startDate, endDate, limit = 50, sortBy = "quantity" } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Calculate product sales
    const productSales = {};
    
    for (const order of activeOrders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const productId = item.productId;
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = {
                productId,
                totalQuantity: 0,
                totalRevenue: 0,
                orderCount: 0,
                productName: item.name || "Unknown Product",
                productImage: item.image || ""
              };
            }
            
            const quantity = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            
            productSales[productId].totalQuantity += quantity;
            productSales[productId].totalRevenue += roundTo2Decimals(quantity * price);
            productSales[productId].orderCount += 1;
          }
        }
      }
    }
    
    // Fetch product details for products that have sales
    const productIds = Object.keys(productSales);
    const productsMap = {};
    
    for (const productId of productIds) {
      const productData = await getProductDetails(productId);
      if (productData) {
        productsMap[productId] = productData;
        // Update product name and image from database if available
        if (productData.name) {
          const name = typeof productData.name === 'string' 
            ? productData.name 
            : (productData.name.en || productData.name.ar || productData.name.he || "");
          productSales[productId].productName = name;
        }
        if (productData.image) {
          productSales[productId].productImage = productData.image;
        }
        productSales[productId].category = productData.category || productData.categories?.[0] || "";
        productSales[productId].brand = productData.brand || "";
      }
    }
    
    // Convert to array and sort
    let bestSellers = Object.values(productSales);
    
    if (sortBy === "revenue") {
      bestSellers.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === "orders") {
      bestSellers.sort((a, b) => b.orderCount - a.orderCount);
    } else {
      // Default: sort by quantity
      bestSellers.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }
    
    // Apply limit
    const limitNum = parseInt(limit, 10) || 50;
    bestSellers = bestSellers.slice(0, limitNum);
    
    res.json({
      bestSellers,
      total: bestSellers.length,
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({ error: "Failed to fetch best sellers", details: error.message });
  }
});

// 3. Revenue by Time Period
router.get("/revenue-by-period", async (req, res) => {
  try {
    const { period = "day", startDate, endDate } = req.query;
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    const { start, end } = parseDateRange(startDate, endDate);
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Group by period
    const revenueByPeriod = {};
    
    for (const order of activeOrders) {
      if (!order.createdAt) continue;
      
      const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      let periodKey = "";
      
      if (period === "day") {
        periodKey = orderDate.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "week") {
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay()); // Start of week (Sunday)
        periodKey = weekStart.toISOString().split("T")[0];
      } else if (period === "month") {
        periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
      } else if (period === "year") {
        periodKey = String(orderDate.getFullYear());
      }
      
      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = {
          period: periodKey,
          revenue: 0,
          orders: 0,
          averageOrderValue: 0
        };
      }
      
      revenueByPeriod[periodKey].revenue += Number(order.total) || 0;
      revenueByPeriod[periodKey].orders += 1;
    }
    
    // Calculate average order value and sort
    const revenueData = Object.values(revenueByPeriod).map(item => ({
      ...item,
      revenue: roundTo2Decimals(item.revenue),
      averageOrderValue: item.orders > 0 ? roundTo2Decimals(item.revenue / item.orders) : 0
    }));
    
    // Sort by period (ascending)
    revenueData.sort((a, b) => a.period.localeCompare(b.period));
    
    res.json({
      period,
      data: revenueData,
      totalRevenue: roundTo2Decimals(revenueData.reduce((sum, item) => sum + item.revenue, 0)),
      totalOrders: revenueData.reduce((sum, item) => sum + item.orders, 0)
    });
  } catch (error) {
    console.error("Error fetching revenue by period:", error);
    res.status(500).json({ error: "Failed to fetch revenue by period", details: error.message });
  }
});

// 4. Order Status Report
router.get("/order-status", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Group by status
    const statusCounts = {};
    const statusRevenue = {};
    const statusDetails = [];
    
    // Normalize status (map old statuses to new ones)
    const normalizeStatus = (status) => {
      if (status === "paid" || status === "pending") return "new";
      if (status === "processing") return "in-progress";
      if (status === "fulfilled") return "delivered-to-customer";
      return status || "new";
    };
    
    for (const order of orders) {
      const status = normalizeStatus(order.status);
      
      if (!statusCounts[status]) {
        statusCounts[status] = 0;
        statusRevenue[status] = 0;
      }
      
      statusCounts[status] += 1;
      if (status !== "cancelled") {
        statusRevenue[status] += Number(order.total) || 0;
      }
    }
    
    // Calculate percentages and create details array
    const totalOrders = orders.length;
    const totalRevenue = Object.values(statusRevenue).reduce((sum, rev) => sum + rev, 0);
    
    for (const [status, count] of Object.entries(statusCounts)) {
      const revenue = statusRevenue[status] || 0;
      statusDetails.push({
        status,
        count,
        percentage: totalOrders > 0 ? roundTo2Decimals((count / totalOrders) * 100) : 0,
        revenue: roundTo2Decimals(revenue),
        revenuePercentage: totalRevenue > 0 ? roundTo2Decimals((revenue / totalRevenue) * 100) : 0
      });
    }
    
    // Sort by count (descending)
    statusDetails.sort((a, b) => b.count - a.count);
    
    res.json({
      totalOrders,
      totalRevenue: roundTo2Decimals(totalRevenue),
      statusBreakdown: statusDetails,
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching order status report:", error);
    res.status(500).json({ error: "Failed to fetch order status report", details: error.message });
  }
});

// 5. Product Performance by Category
router.get("/products-by-category", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Track category performance
    const categoryStats = {};
    
    for (const order of activeOrders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const productId = item.productId;
          if (!productId) continue;
          
          // Get product details to find category
          const productData = await getProductDetails(productId);
          if (!productData) continue;
          
          // Get category (support both old and new format)
          const categories = productData.categoryPairs || 
                           (productData.categories ? productData.categories.map((cat, idx) => ({
                             category: cat,
                             subCategory: productData.subCategories?.[idx] || ""
                           })) : []);
          
          if (categories.length === 0 && productData.category) {
            categories.push({
              category: productData.category,
              subCategory: productData.subCategory || ""
            });
          }
          
          // If no categories found, use "Uncategorized"
          if (categories.length === 0) {
            categories.push({ category: "Uncategorized", subCategory: "" });
          }
          
          for (const { category, subCategory } of categories) {
            const categoryKey = category || "Uncategorized";
            const subCategoryKey = subCategory || "";
            const fullKey = subCategoryKey ? `${categoryKey} > ${subCategoryKey}` : categoryKey;
            
            if (!categoryStats[fullKey]) {
              categoryStats[fullKey] = {
                category: categoryKey,
                subCategory: subCategoryKey,
                revenue: 0,
                quantity: 0,
                orderCount: 0,
                productCount: new Set()
              };
            }
            
            const quantity = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            
            categoryStats[fullKey].revenue += roundTo2Decimals(quantity * price);
            categoryStats[fullKey].quantity += quantity;
            categoryStats[fullKey].orderCount += 1;
            categoryStats[fullKey].productCount.add(productId);
          }
        }
      }
    }
    
    // Convert to array and format
    const categoryPerformance = Object.entries(categoryStats).map(([key, stats]) => ({
      category: stats.category,
      subCategory: stats.subCategory,
      fullCategory: key,
      revenue: roundTo2Decimals(stats.revenue),
      quantity: stats.quantity,
      orderCount: stats.orderCount,
      productCount: stats.productCount.size,
      averageOrderValue: stats.orderCount > 0 ? roundTo2Decimals(stats.revenue / stats.orderCount) : 0
    }));
    
    // Sort by revenue (descending)
    categoryPerformance.sort((a, b) => b.revenue - a.revenue);
    
    // Calculate totals
    const totalRevenue = categoryPerformance.reduce((sum, cat) => sum + cat.revenue, 0);
    
    res.json({
      categories: categoryPerformance,
      totalRevenue: roundTo2Decimals(totalRevenue),
      totalCategories: categoryPerformance.length,
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ error: "Failed to fetch products by category", details: error.message });
  }
});

// 6. Payment Method Report
router.get("/payment-method", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Group by payment method
    const paymentMethodStats = {};
    
    for (const order of activeOrders) {
      const paymentMethod = order.metadata?.paymentMethod || "unknown";
      
      if (!paymentMethodStats[paymentMethod]) {
        paymentMethodStats[paymentMethod] = {
          paymentMethod,
          orderCount: 0,
          revenue: 0
        };
      }
      
      paymentMethodStats[paymentMethod].orderCount += 1;
      paymentMethodStats[paymentMethod].revenue += Number(order.total) || 0;
    }
    
    // Convert to array and calculate percentages
    const totalOrders = activeOrders.length;
    const totalRevenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    
    const paymentMethods = Object.values(paymentMethodStats).map(stats => ({
      paymentMethod: stats.paymentMethod,
      orderCount: stats.orderCount,
      orderPercentage: totalOrders > 0 ? roundTo2Decimals((stats.orderCount / totalOrders) * 100) : 0,
      revenue: roundTo2Decimals(stats.revenue),
      revenuePercentage: totalRevenue > 0 ? roundTo2Decimals((stats.revenue / totalRevenue) * 100) : 0,
      averageOrderValue: stats.orderCount > 0 ? roundTo2Decimals(stats.revenue / stats.orderCount) : 0
    }));
    
    // Sort by revenue (descending)
    paymentMethods.sort((a, b) => b.revenue - a.revenue);
    
    res.json({
      paymentMethods,
      totalOrders,
      totalRevenue: roundTo2Decimals(totalRevenue),
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching payment method report:", error);
    res.status(500).json({ error: "Failed to fetch payment method report", details: error.message });
  }
});

// 7. Geographic Sales Report
router.get("/geographic-sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    // Get all orders
    let ordersSnapshot = await db.collection("orders").get();
    let orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
    
    // Filter by date range if provided
    if (start || end) {
      orders = filterOrdersByDate(orders, start, end);
    }
    
    // Filter out cancelled orders
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    
    // Group by location
    const locationStats = {};
    const deliveryZoneStats = {};
    const deliveryTypeStats = {
      delivery: { orderCount: 0, revenue: 0 },
      pickup: { orderCount: 0, revenue: 0 }
    };
    
    for (const order of activeOrders) {
      const deliveryType = order.metadata?.deliveryType || "unknown";
      const deliveryZone = order.metadata?.deliveryZone || null;
      const shippingAddress = order.shippingAddress;
      
      // Track delivery type
      if (deliveryTypeStats[deliveryType]) {
        deliveryTypeStats[deliveryType].orderCount += 1;
        deliveryTypeStats[deliveryType].revenue += Number(order.total) || 0;
      }
      
      // Track delivery zone
      if (deliveryZone) {
        if (!deliveryZoneStats[deliveryZone]) {
          deliveryZoneStats[deliveryZone] = {
            zone: deliveryZone,
            orderCount: 0,
            revenue: 0
          };
        }
        deliveryZoneStats[deliveryZone].orderCount += 1;
        deliveryZoneStats[deliveryZone].revenue += Number(order.total) || 0;
      }
      
      // Track by city
      if (shippingAddress && shippingAddress.city) {
        const city = shippingAddress.city;
        if (!locationStats[city]) {
          locationStats[city] = {
            city,
            zipCode: shippingAddress.zipCode || "",
            orderCount: 0,
            revenue: 0
          };
        }
        locationStats[city].orderCount += 1;
        locationStats[city].revenue += Number(order.total) || 0;
      } else if (deliveryType === "pickup") {
        // Track pickup orders separately
        if (!locationStats["Store Pickup"]) {
          locationStats["Store Pickup"] = {
            city: "Store Pickup",
            zipCode: "",
            orderCount: 0,
            revenue: 0
          };
        }
        locationStats["Store Pickup"].orderCount += 1;
        locationStats["Store Pickup"].revenue += Number(order.total) || 0;
      }
    }
    
    // Convert to arrays and format
    const citySales = Object.values(locationStats).map(stats => ({
      ...stats,
      revenue: roundTo2Decimals(stats.revenue),
      averageOrderValue: stats.orderCount > 0 ? roundTo2Decimals(stats.revenue / stats.orderCount) : 0
    }));
    
    const zoneSales = Object.values(deliveryZoneStats).map(stats => ({
      ...stats,
      revenue: roundTo2Decimals(stats.revenue),
      averageOrderValue: stats.orderCount > 0 ? roundTo2Decimals(stats.revenue / stats.orderCount) : 0
    }));
    
    // Format delivery type stats
    const deliveryTypeData = Object.entries(deliveryTypeStats).map(([type, stats]) => ({
      deliveryType: type,
      orderCount: stats.orderCount,
      revenue: roundTo2Decimals(stats.revenue),
      averageOrderValue: stats.orderCount > 0 ? roundTo2Decimals(stats.revenue / stats.orderCount) : 0
    }));
    
    // Sort by revenue (descending)
    citySales.sort((a, b) => b.revenue - a.revenue);
    zoneSales.sort((a, b) => b.revenue - a.revenue);
    
    const totalRevenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    
    res.json({
      citySales,
      zoneSales,
      deliveryTypeBreakdown: deliveryTypeData,
      totalOrders: activeOrders.length,
      totalRevenue: roundTo2Decimals(totalRevenue),
      period: {
        startDate: start ? start.toDate().toISOString() : null,
        endDate: end ? end.toDate().toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error fetching geographic sales:", error);
    res.status(500).json({ error: "Failed to fetch geographic sales", details: error.message });
  }
});

export default router;

