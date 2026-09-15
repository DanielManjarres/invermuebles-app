import type { CatalogProductRecord } from "@/lib/catalog-products";
import type { Product } from "@/lib/products";
import { customerStatusLabels, type AdminCustomer } from "@/lib/customers";
import {
  orderChannelLabels,
  orderStatusLabels,
  type AdminOrder,
} from "@/lib/orders";
import { movementLabels, type StockMovement } from "@/lib/stock-movements";
import {
  paymentMethodLabels,
  saleSourceLabels,
  saleStatusLabels,
  saleTypeLabels,
  type AdminSale,
} from "@/lib/sales";
import type { AdminCredit } from "@/lib/credits";
import { buildPortfolioAccounts } from "@/lib/portfolio";
import {
  downloadExcelReport,
  reportDateSuffix,
  type ExcelSheet,
} from "@/lib/excel-reports";

const moneyFormat = '"$" #,##0.00';

function yesNo(value: boolean) {
  return value ? "Sí" : "No";
}

function excelDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

export function downloadProductsReport(products: CatalogProductRecord[]) {
  const rows = products.map((product) => {
    const costWithTax = product.baseCost * (1 + product.taxRate / 100);
    const saleBase = product.salePrice / (1 + product.taxRate / 100);
    const margin = saleBase > 0 ? (saleBase - product.baseCost) / saleBase : 0;

    return {
      attributes: product.attributeValues
        .map((attribute) => `${attribute.attributeName}: ${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}`)
        .join(" · "),
      baseCost: product.baseCost,
      brand: product.brand || "Sin registrar",
      category: product.categoryName,
      costWithTax,
      details: product.details,
      featured: yesNo(product.featured),
      location: product.location || "Sin registrar",
      margin,
      minimumStock: product.minimumStock,
      model: product.model || "Sin registrar",
      name: product.name,
      productType: product.productTypeName,
      purchaseTax: costWithTax - product.baseCost,
      reference: product.reference,
      saleBase,
      salePrice: product.salePrice,
      saleTax: product.salePrice - saleBase,
      stock: product.stock,
      visible: yesNo(product.visible),
    };
  });
  const sheets: ExcelSheet[] = [{
    name: "Productos",
    columns: [
      { header: "Producto", key: "name", width: 34 },
      { header: "Referencia", key: "reference", width: 20 },
      { header: "Marca", key: "brand", width: 18 },
      { header: "Modelo", key: "model", width: 20 },
      { header: "Categoría", key: "category", width: 20 },
      { header: "Tipo", key: "productType", width: 20 },
      { header: "Características", key: "attributes", width: 45 },
      { header: "Costo antes de IVA", key: "baseCost", width: 20, numberFormat: moneyFormat },
      { header: "IVA compra", key: "purchaseTax", width: 16, numberFormat: moneyFormat },
      { header: "Costo con IVA", key: "costWithTax", width: 18, numberFormat: moneyFormat },
      { header: "Venta antes de IVA", key: "saleBase", width: 20, numberFormat: moneyFormat },
      { header: "IVA venta", key: "saleTax", width: 16, numberFormat: moneyFormat },
      { header: "Precio final", key: "salePrice", width: 18, numberFormat: moneyFormat },
      { header: "Margen %", key: "margin", width: 14, numberFormat: "0.00%" },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Stock mínimo", key: "minimumStock", width: 14 },
      { header: "Ubicación", key: "location", width: 20 },
      { header: "En catálogo", key: "visible", width: 14 },
      { header: "En inicio", key: "featured", width: 12 },
      { header: "Descripción", key: "details", width: 50 },
    ],
    rows,
  }];
  return downloadExcelReport({
    fileName: `informe-productos-${reportDateSuffix()}`,
    sheets,
  });
}

export function downloadInventoryReport(products: Product[]) {
  const rows = products.map((product) => {
    const minimumStock = product.minimumStock ?? 0;
    const status = product.stock === 0
      ? "Agotado"
      : product.stock <= minimumStock
        ? "Stock bajo"
        : "Disponible";

    return {
      category: product.catalogCategory || product.category,
      difference: product.stock - minimumStock,
      location: product.location || "Sin registrar",
      minimumStock,
      product: product.name,
      productType: product.catalogProductType || product.productClass,
      reference: product.reference,
      status,
      stock: product.stock,
    };
  });
  return downloadExcelReport({
    fileName: `informe-inventario-${reportDateSuffix()}`,
    sheets: [{
      name: "Inventario",
      columns: [
        { header: "Producto", key: "product", width: 34 },
        { header: "Referencia", key: "reference", width: 20 },
        { header: "Categoría", key: "category", width: 20 },
        { header: "Tipo", key: "productType", width: 18 },
        { header: "Ubicación", key: "location", width: 20 },
        { header: "Stock actual", key: "stock", width: 14 },
        { header: "Stock mínimo", key: "minimumStock", width: 14 },
        { header: "Diferencia", key: "difference", width: 12 },
        { header: "Estado", key: "status", width: 14 },
      ],
      rows,
    }],
  });
}

export function downloadMovementsReport(movements: StockMovement[]) {
  return downloadExcelReport({
    fileName: `informe-movimientos-${reportDateSuffix()}`,
    sheets: [{
      name: "Movimientos",
      columns: [
        { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
        { header: "Tipo", key: "type", width: 12 },
        { header: "Producto", key: "product", width: 34 },
        { header: "Referencia", key: "reference", width: 20 },
        { header: "Categoría", key: "category", width: 20 },
        { header: "Tipo de producto", key: "productType", width: 20 },
        { header: "Cantidad", key: "quantity", width: 12 },
        { header: "Stock anterior", key: "previousStock", width: 16 },
        { header: "Stock final", key: "nextStock", width: 14 },
        { header: "Motivo", key: "reason", width: 22 },
        { header: "Observación", key: "note", width: 40 },
        { header: "Usuario", key: "user", width: 18 },
      ],
      rows: movements.map((movement) => ({
        createdAt: excelDate(movement.createdAtISO),
        type: movementLabels[movement.type],
        product: movement.productName,
        reference: movement.productReference,
        category: movement.productCategory,
        productType: movement.productClass,
        quantity: movement.quantity,
        previousStock: movement.previousStock,
        nextStock: movement.nextStock,
        reason: movement.reason,
        note: movement.note || "Sin observación",
        user: movement.user,
      })),
    }],
  });
}

export function downloadCustomersReport(customers: AdminCustomer[]) {
  return downloadExcelReport({
    fileName: `informe-clientes-${reportDateSuffix()}`,
    sheets: [{
      name: "Clientes",
      columns: [
        { header: "Cliente", key: "name", width: 32 },
        { header: "Cédula", key: "document", width: 18 },
        { header: "Estado", key: "status", width: 14 },
        { header: "Teléfono", key: "phone", width: 18 },
        { header: "Correo", key: "email", width: 30 },
        { header: "Dirección", key: "address", width: 30 },
        { header: "Barrio", key: "neighborhood", width: 20 },
        { header: "Ciudad", key: "city", width: 18 },
        { header: "Contacto de referencia", key: "referenceName", width: 28 },
        { header: "Relación", key: "referenceRelation", width: 18 },
        { header: "Teléfono de referencia", key: "referencePhone", width: 20 },
        { header: "Pedidos", key: "orders", width: 10 },
        { header: "Ventas", key: "sales", width: 10 },
        { header: "Créditos", key: "credits", width: 10 },
        { header: "Créditos activos", key: "activeCredits", width: 16 },
        { header: "Créditos en mora", key: "overdueCredits", width: 16 },
        { header: "Pagos", key: "payments", width: 10 },
        { header: "Total pagado", key: "totalPaid", width: 18, numberFormat: moneyFormat },
        { header: "Último pago", key: "lastPayment", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
        { header: "Observaciones", key: "notes", width: 40 },
        { header: "Registrado", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
      ],
      rows: customers.map((customer) => ({
        name: customer.fullName,
        document: customer.document,
        status: customerStatusLabels[customer.status],
        phone: customer.phone,
        email: customer.email || "Sin registrar",
        address: customer.address || "Sin registrar",
        neighborhood: customer.neighborhood || "Sin registrar",
        city: customer.city || "Sin registrar",
        referenceName: customer.referenceName || "Sin registrar",
        referenceRelation: customer.referenceRelation || "Sin registrar",
        referencePhone: customer.referencePhone || "Sin registrar",
        orders: customer.ordersCount,
        sales: customer.salesCount,
        credits: customer.creditsCount,
        activeCredits: customer.activeCreditsCount,
        overdueCredits: customer.overdueCreditsCount,
        payments: customer.paymentsCount,
        totalPaid: customer.totalPaid,
        lastPayment: customer.lastPaymentAt ? excelDate(customer.lastPaymentAt) : "Sin pagos",
        notes: customer.notes || "Sin observaciones",
        createdAt: excelDate(customer.createdAt),
      })),
    }],
  });
}

export function downloadOrdersReport(orders: AdminOrder[]) {
  return downloadExcelReport({
    fileName: `informe-pedidos-${reportDateSuffix()}`,
    sheets: [
      {
        name: "Pedidos",
        columns: [
          { header: "Pedido", key: "number", width: 14 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Estado", key: "status", width: 14 },
          { header: "Canal", key: "channel", width: 14 },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Cédula", key: "document", width: 18 },
          { header: "Unidades", key: "quantity", width: 12 },
          { header: "Venta relacionada", key: "sale", width: 18 },
          { header: "Observaciones", key: "notes", width: 45 },
        ],
        rows: orders.map((order) => ({
          number: order.shortId,
          createdAt: excelDate(order.createdAtISO),
          status: orderStatusLabels[order.status],
          channel: orderChannelLabels[order.channel],
          customer: order.customerName || "Sin asociar",
          document: order.customerDocument || "Sin asociar",
          quantity: order.totalQuantity,
          sale: order.saleShortId || "Sin venta",
          notes: order.notes || "Sin observaciones",
        })),
      },
      {
        name: "Productos de pedidos",
        columns: [
          { header: "Pedido", key: "order", width: 14 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Producto", key: "product", width: 34 },
          { header: "Referencia", key: "reference", width: 20 },
          { header: "Categoría", key: "category", width: 20 },
          { header: "Tipo", key: "productType", width: 18 },
          { header: "Cantidad", key: "quantity", width: 12 },
        ],
        rows: orders.flatMap((order) => order.items.map((item) => ({
          order: order.shortId,
          createdAt: excelDate(order.createdAtISO),
          product: item.productName,
          reference: item.productReference,
          category: item.productCategory,
          productType: item.productClass,
          quantity: item.quantity,
        }))),
      },
    ],
  });
}

export function downloadSalesReport(sales: AdminSale[]) {
  return downloadExcelReport({
    fileName: `informe-ventas-${reportDateSuffix()}`,
    sheets: [
      {
        name: "Ventas",
        columns: [
          { header: "N.º venta", key: "number", width: 15 },
          { header: "Factura electrónica", key: "invoice", width: 20 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Origen", key: "source", width: 15 },
          { header: "Tipo", key: "type", width: 16 },
          { header: "Estado", key: "status", width: 20 },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Cédula", key: "document", width: 18 },
          { header: "Teléfono", key: "phone", width: 18 },
          { header: "Pedido", key: "order", width: 14 },
          { header: "Cuenta/crédito", key: "credit", width: 16 },
          { header: "Unidades", key: "quantity", width: 10 },
          { header: "Base gravable", key: "taxableBase", width: 18, numberFormat: moneyFormat },
          { header: "IVA", key: "tax", width: 16, numberFormat: moneyFormat },
          { header: "Total", key: "total", width: 18, numberFormat: moneyFormat },
          { header: "Recibido", key: "paid", width: 18, numberFormat: moneyFormat },
          { header: "Saldo", key: "balance", width: 18, numberFormat: moneyFormat },
          { header: "Medio inicial", key: "paymentMethod", width: 18 },
          { header: "Plazo (meses)", key: "months", width: 14 },
          { header: "Interés %", key: "interest", width: 12, numberFormat: "0.00%" },
          { header: "Observaciones", key: "notes", width: 40 },
        ],
        rows: sales.map((sale) => ({
          number: sale.shortId,
          invoice: sale.invoiceCode || "Sin registrar",
          createdAt: excelDate(sale.createdAtISO),
          source: saleSourceLabels[sale.source],
          type: saleTypeLabels[sale.type],
          status: saleStatusLabels[sale.status],
          customer: sale.customerName,
          document: sale.customerDocument,
          phone: sale.customerPhone,
          order: sale.orderShortId || "Venta local",
          credit: sale.creditId ? sale.creditId.slice(-6).toUpperCase() : "No aplica",
          quantity: sale.totalQuantity,
          taxableBase: sale.taxableBase,
          tax: sale.taxAmount,
          total: sale.total,
          paid: sale.amountPaid,
          balance: sale.balance,
          paymentMethod: sale.paymentMethod
            ? paymentMethodLabels[sale.paymentMethod]
            : "Sin registrar",
          months: sale.creditMonths ?? "No aplica",
          interest: (sale.interestRate ?? 0) / 100,
          notes: sale.notes || "Sin observaciones",
        })),
      },
      {
        name: "Productos vendidos",
        columns: [
          { header: "N.º venta", key: "sale", width: 15 },
          { header: "Factura electrónica", key: "invoice", width: 20 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Producto", key: "product", width: 34 },
          { header: "Referencia", key: "reference", width: 20 },
          { header: "Cantidad", key: "quantity", width: 10 },
          { header: "Precio unitario", key: "unitPrice", width: 18, numberFormat: moneyFormat },
          { header: "Subtotal", key: "subtotal", width: 18, numberFormat: moneyFormat },
        ],
        rows: sales.flatMap((sale) => sale.items.map((item) => ({
          sale: sale.shortId,
          invoice: sale.invoiceCode || "Sin registrar",
          createdAt: excelDate(sale.createdAtISO),
          customer: sale.customerName,
          product: item.productName,
          reference: item.productReference,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.lineTotal,
        }))),
      },
      {
        name: "Pagos de ventas",
        columns: [
          { header: "Recibo", key: "receipt", width: 18 },
          { header: "N.º venta", key: "sale", width: 15 },
          { header: "Factura electrónica", key: "invoice", width: 20 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Tipo", key: "type", width: 16 },
          { header: "Valor", key: "amount", width: 18, numberFormat: moneyFormat },
          { header: "Medio", key: "method", width: 18 },
          { header: "Referencia", key: "reference", width: 20 },
          { header: "Pago inicial", key: "initial", width: 14 },
          { header: "Usuario", key: "user", width: 18 },
          { header: "Observación", key: "note", width: 40 },
        ],
        rows: sales.flatMap((sale) => sale.payments.map((payment) => ({
          receipt: payment.receiptNumber || "Sin consecutivo",
          sale: sale.shortId,
          invoice: sale.invoiceCode || "Sin registrar",
          createdAt: excelDate(payment.createdAtISO),
          customer: sale.customerName,
          type: saleTypeLabels[sale.type],
          amount: payment.amount,
          method: paymentMethodLabels[payment.method],
          reference: payment.reference || "Sin referencia",
          initial: yesNo(payment.isInitial),
          user: payment.userName,
          note: payment.note || "Sin observación",
        }))),
      },
    ],
  });
}

export function downloadCreditsReport(credits: AdminCredit[], sales: AdminSale[]) {
  const accounts = buildPortfolioAccounts(credits, sales);
  const invoiceBySale = new Map(sales.map((sale) => [sale.id, sale.invoiceCode]));
  return downloadExcelReport({
    fileName: `informe-cartera-${reportDateSuffix()}`,
    sheets: [
      {
        name: "Cuentas",
        columns: [
          { header: "Cuenta", key: "account", width: 16 },
          { header: "N.º venta", key: "sale", width: 15 },
          { header: "Factura electrónica", key: "invoice", width: 20 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Cédula", key: "document", width: 18 },
          { header: "Teléfono", key: "phone", width: 18 },
          { header: "Tipo", key: "type", width: 16 },
          { header: "Estado", key: "status", width: 14 },
          { header: "Plazo (meses)", key: "months", width: 14 },
          { header: "Interés %", key: "interestRate", width: 12, numberFormat: "0.00%" },
          { header: "Capital inicial", key: "principal", width: 18, numberFormat: moneyFormat },
          { header: "Valor total", key: "total", width: 20, numberFormat: moneyFormat },
          { header: "Capital pendiente", key: "principalBalance", width: 20, numberFormat: moneyFormat },
          { header: "Interés pendiente", key: "interestBalance", width: 20, numberFormat: moneyFormat },
          { header: "Saldo total", key: "balance", width: 18, numberFormat: moneyFormat },
          { header: "Total pagado", key: "paid", width: 18, numberFormat: moneyFormat },
          { header: "Cantidad de pagos", key: "payments", width: 16 },
          { header: "Último pago", key: "lastPayment", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
        ],
        rows: accounts.map((account) => ({
          account: account.shortId,
          sale: account.saleShortId,
          invoice: invoiceBySale.get(account.saleId) || "Sin registrar",
          createdAt: excelDate(account.createdAtISO),
          customer: account.customerName,
          document: account.customerDocument,
          phone: account.customerPhone,
          type: account.title,
          status: account.statusLabel,
          months: account.credit?.months ?? "No aplica",
          interestRate: (account.credit?.interestRate ?? 0) / 100,
          principal: account.credit?.principal ?? account.total,
          total: account.total,
          principalBalance: account.credit?.outstandingPrincipal ?? account.balance,
          interestBalance: account.credit?.interestBalance ?? 0,
          balance: account.balance,
          paid: account.amountPaid,
          payments: account.payments.length,
          lastPayment: account.payments[0]
            ? excelDate(account.payments[0].createdAtISO)
            : "Sin pagos",
        })),
      },
      {
        name: "Productos de cuentas",
        columns: [
          { header: "Cuenta", key: "account", width: 16 },
          { header: "N.º venta", key: "sale", width: 15 },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Producto", key: "product", width: 34 },
          { header: "Referencia", key: "reference", width: 20 },
          { header: "Cantidad", key: "quantity", width: 10 },
          { header: "Precio unitario", key: "unitPrice", width: 18, numberFormat: moneyFormat },
          { header: "Subtotal", key: "subtotal", width: 18, numberFormat: moneyFormat },
        ],
        rows: accounts.flatMap((account) => account.items.map((item) => ({
          account: account.shortId,
          sale: account.saleShortId,
          customer: account.customerName,
          product: item.productName,
          reference: item.productReference,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.lineTotal,
        }))),
      },
      {
        name: "Pagos",
        columns: [
          { header: "Recibo", key: "receipt", width: 18 },
          { header: "Cuenta", key: "account", width: 16 },
          { header: "N.º venta", key: "sale", width: 15 },
          { header: "Factura electrónica", key: "invoice", width: 20 },
          { header: "Fecha", key: "createdAt", width: 20, numberFormat: "dd/mm/yyyy hh:mm" },
          { header: "Cliente", key: "customer", width: 30 },
          { header: "Valor", key: "amount", width: 18, numberFormat: moneyFormat },
          { header: "Capital", key: "principal", width: 18, numberFormat: moneyFormat },
          { header: "Interés", key: "interest", width: 18, numberFormat: moneyFormat },
          { header: "Medio", key: "method", width: 18 },
          { header: "Referencia", key: "reference", width: 20 },
          { header: "Pago inicial", key: "initial", width: 14 },
          { header: "Usuario", key: "user", width: 18 },
          { header: "Observación", key: "note", width: 40 },
        ],
        rows: accounts.flatMap((account) => account.payments.map((payment) => ({
          receipt: payment.receiptNumber || "Sin consecutivo",
          account: account.shortId,
          sale: account.saleShortId,
          invoice: invoiceBySale.get(account.saleId) || "Sin registrar",
          createdAt: excelDate(payment.createdAtISO),
          customer: account.customerName,
          amount: payment.amount,
          principal: payment.principalAmount,
          interest: payment.interestAmount,
          method: payment.methodLabel,
          reference: payment.reference || "Sin referencia",
          initial: yesNo(payment.isInitial),
          user: payment.userName,
          note: payment.note || "Sin observación",
        }))),
      },
    ],
  });
}
