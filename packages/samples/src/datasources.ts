import type { DataSourceDescriptor } from '@easyink/datasource'
import type { DocumentSchema, TableNode } from '@easyink/schema'
import { SCHEMA_VERSION } from '@easyink/shared'

// ---------------------------------------------------------------------------
// A. Invoice data source
// Covers: scalar text/image, nested groups, collection for table-data binding
// ---------------------------------------------------------------------------

export const invoiceDataSource: DataSourceDescriptor = {
  id: 'invoice',
  name: 'Invoice',
  title: 'Invoice',
  expand: true,
  fields: [
    {
      name: 'company',
      title: 'Company',
      path: 'company',
      expand: true,
      fields: [
        { name: 'name', title: 'Company Name', path: 'company/name', use: 'text' },
        { name: 'logo', title: 'Company Logo', path: 'company/logo', use: 'image' },
        { name: 'address', title: 'Address', path: 'company/address', use: 'text' },
        { name: 'phone', title: 'Phone', path: 'company/phone', use: 'text' },
      ],
    },
    {
      name: 'invoice',
      title: 'Invoice Info',
      path: 'invoice',
      expand: true,
      fields: [
        { name: 'number', title: 'Invoice No.', path: 'invoice/number', use: 'text' },
        { name: 'date', title: 'Date', path: 'invoice/date', use: 'text' },
        { name: 'dueDate', title: 'Due Date', path: 'invoice/dueDate', use: 'text' },
      ],
    },
    {
      name: 'customer',
      title: 'Customer',
      path: 'customer',
      fields: [
        { name: 'name', title: 'Customer Name', path: 'customer/name', use: 'text' },
        { name: 'address', title: 'Customer Address', path: 'customer/address', use: 'text' },
      ],
    },
    {
      name: 'items',
      title: 'Line Items',
      path: 'items',
      tag: 'collection',
      expand: true,
      fields: [
        { name: 'name', title: 'Product Name', path: 'items/name', use: 'text' },
        { name: 'qty', title: 'Quantity', path: 'items/qty', use: 'text' },
        { name: 'price', title: 'Unit Price', path: 'items/price', use: 'text' },
        { name: 'amount', title: 'Amount', path: 'items/amount', use: 'text' },
      ],
    },
    { name: 'subtotal', title: 'Subtotal', path: 'subtotal', use: 'text' },
    { name: 'taxRate', title: 'Tax Rate', path: 'taxRate', use: 'text' },
    { name: 'taxAmount', title: 'Tax Amount', path: 'taxAmount', use: 'text' },
    { name: 'grandTotal', title: 'Grand Total', path: 'grandTotal', use: 'text' },
    { name: 'notes', title: 'Notes', path: 'notes', use: 'rich-text' },
  ],
}

// ---------------------------------------------------------------------------
// B. Product data source
// Covers: barcode, qrcode, image, union binding
// ---------------------------------------------------------------------------

export const productDataSource: DataSourceDescriptor = {
  id: 'product',
  name: 'Product',
  title: 'Product',
  fields: [
    { name: 'name', title: 'Product Name', path: 'name', use: 'text' },
    {
      name: 'sku',
      title: 'SKU',
      path: 'sku',
      use: 'barcode',
      props: { format: 'CODE128', showText: true },
      union: [
        { name: 'skuLabel', path: 'sku', use: 'text', offsetX: 0, offsetY: 22 },
      ],
    },
    { name: 'qrUrl', title: 'QR Link', path: 'qrUrl', use: 'qrcode' },
    { name: 'photo', title: 'Product Photo', path: 'photo', use: 'image' },
    { name: 'price', title: 'Price', path: 'price', use: 'text' },
    { name: 'category', title: 'Category', path: 'category', use: 'text' },
    {
      name: 'specs',
      title: 'Specifications',
      path: 'specs',
      fields: [
        { name: 'weight', title: 'Weight', path: 'specs/weight', use: 'text' },
        { name: 'dimension', title: 'Dimension', path: 'specs/dimension', use: 'text' },
        { name: 'color', title: 'Color', path: 'specs/color', use: 'text' },
        { name: 'material', title: 'Material', path: 'specs/material', use: 'text' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// C. Order list data source
// Covers: flat collection for table-data, multi-level nesting, headless
// ---------------------------------------------------------------------------

export const orderListDataSource: DataSourceDescriptor = {
  id: 'order-list',
  name: 'Order List',
  title: 'Order List',
  headless: true,
  fields: [
    {
      name: 'orders',
      title: 'Orders',
      path: 'orders',
      tag: 'collection',
      expand: true,
      fields: [
        { name: 'orderId', title: 'Order ID', path: 'orders/orderId', use: 'text' },
        { name: 'customer', title: 'Customer', path: 'orders/customer', use: 'text' },
        { name: 'date', title: 'Order Date', path: 'orders/date', use: 'text' },
        { name: 'status', title: 'Status', path: 'orders/status', use: 'text' },
        { name: 'amount', title: 'Total Amount', path: 'orders/amount', use: 'text' },
        {
          name: 'items',
          title: 'Order Items',
          path: 'orders/items',
          tag: 'collection',
          fields: [
            { name: 'productName', title: 'Product', path: 'orders/items/productName', use: 'text' },
            { name: 'qty', title: 'Qty', path: 'orders/items/qty', use: 'text' },
            { name: 'unitPrice', title: 'Unit Price', path: 'orders/items/unitPrice', use: 'text' },
          ],
        },
      ],
    },
    { name: 'totalOrders', title: 'Total Orders', path: 'totalOrders', use: 'text' },
    { name: 'totalRevenue', title: 'Total Revenue', path: 'totalRevenue', use: 'text' },
  ],
}

// ---------------------------------------------------------------------------
// All datasources
// ---------------------------------------------------------------------------

export const sampleDataSources: DataSourceDescriptor[] = [
  invoiceDataSource,
  productDataSource,
  orderListDataSource,
]

// ---------------------------------------------------------------------------
// Invoice template with pre-bound text elements and table-data element
// ---------------------------------------------------------------------------

const invoiceTableNode: TableNode = {
  id: 'inv_items_table',
  type: 'table-data',
  x: 10,
  y: 56,
  width: 190,
  height: 32,
  props: {
    headerBackground: '#f5f5f5',
    summaryBackground: '#fafafa',
    stripedRows: false,
    stripedColor: '#fafafa',
  },
  table: {
    kind: 'data' as const,
    source: {
      sourceId: 'invoice',
      fieldPath: 'items',
      fieldLabel: 'Line Items',
    },
    topology: {
      columns: [
        { ratio: 0.4 },
        { ratio: 0.15 },
        { ratio: 0.2 },
        { ratio: 0.25 },
      ],
      rows: [
        {
          height: 8,
          role: 'header' as const,
          cells: [
            { content: { text: 'Product' } },
            { content: { text: 'Qty' } },
            { content: { text: 'Price' } },
            { content: { text: 'Amount' } },
          ],
        },
        {
          height: 8,
          role: 'repeat-template' as const,
          cells: [
            { binding: { sourceId: 'invoice', fieldPath: 'name', fieldLabel: 'Product Name' } },
            { binding: { sourceId: 'invoice', fieldPath: 'qty', fieldLabel: 'Quantity' } },
            { binding: { sourceId: 'invoice', fieldPath: 'price', fieldLabel: 'Unit Price' } },
            { binding: { sourceId: 'invoice', fieldPath: 'amount', fieldLabel: 'Amount' } },
          ],
        },
        {
          height: 8,
          role: 'footer' as const,
          cells: [
            { content: { text: 'Total' }, colSpan: 3 },
            {},
            {},
            { binding: { sourceId: 'invoice', fieldPath: 'grandTotal', fieldLabel: 'Grand Total' } },
          ],
        },
      ],
    },
    layout: {
      borderAppearance: 'all' as const,
      borderWidth: 0.5,
      borderType: 'solid' as const,
      borderColor: '#cccccc',
    },
  } as TableNode['table'],
}

export const invoiceWithTableTemplate: DocumentSchema = {
  version: SCHEMA_VERSION,
  unit: 'mm',
  page: {
    mode: 'fixed',
    width: 210,
    height: 297,
  },
  guides: { x: [], y: [] },
  elements: [
    // Company name (bound)
    {
      id: 'inv_company',
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 10,
      props: {
        content: '{{Company Name}}',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'company/name',
        fieldLabel: 'Company Name',
      },
    },
    // Company address (bound)
    {
      id: 'inv_address',
      type: 'text',
      x: 10,
      y: 22,
      width: 100,
      height: 6,
      props: {
        content: '{{Address}}',
        fontSize: 9,
        color: '#666666',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'company/address',
        fieldLabel: 'Address',
      },
    },
    // Invoice title
    {
      id: 'inv_title',
      type: 'text',
      x: 140,
      y: 10,
      width: 60,
      height: 10,
      props: {
        content: 'INVOICE',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#1a1a1a',
      },
    },
    // Invoice number (bound)
    {
      id: 'inv_number',
      type: 'text',
      x: 140,
      y: 22,
      width: 60,
      height: 6,
      props: {
        content: '{{Invoice No.}}',
        fontSize: 9,
        textAlign: 'right',
        color: '#666666',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'invoice/number',
        fieldLabel: 'Invoice No.',
      },
    },
    // Invoice date (bound)
    {
      id: 'inv_date',
      type: 'text',
      x: 140,
      y: 29,
      width: 60,
      height: 6,
      props: {
        content: '{{Date}}',
        fontSize: 9,
        textAlign: 'right',
        color: '#666666',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'invoice/date',
        fieldLabel: 'Date',
      },
    },
    // Separator line
    {
      id: 'inv_line',
      type: 'line',
      x: 10,
      y: 40,
      width: 190,
      height: 0,
      props: {
        lineWidth: 0.5,
        lineColor: '#cccccc',
        lineType: 'solid',
      },
    },
    // Customer info (bound)
    {
      id: 'inv_customer',
      type: 'text',
      x: 10,
      y: 44,
      width: 100,
      height: 6,
      props: {
        content: 'Bill To: {{Customer Name}}',
        fontSize: 10,
        color: '#333333',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'customer/name',
        fieldLabel: 'Customer Name',
      },
    },
    // Line items table (table-data with bindings)
    invoiceTableNode,
    // Grand total (bound)
    {
      id: 'inv_grand_total',
      type: 'text',
      x: 140,
      y: 94,
      width: 60,
      height: 8,
      props: {
        content: 'Total: {{Grand Total}}',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#1a1a1a',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'grandTotal',
        fieldLabel: 'Grand Total',
      },
    },
    // Notes (rich-text bound)
    {
      id: 'inv_notes',
      type: 'text',
      x: 10,
      y: 108,
      width: 190,
      height: 12,
      props: {
        content: '{{Notes}}',
        fontSize: 9,
        color: '#999999',
      },
      binding: {
        sourceId: 'invoice',
        fieldPath: 'notes',
        fieldLabel: 'Notes',
      },
    },
  ],
}
