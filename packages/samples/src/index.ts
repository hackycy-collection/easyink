import type { DocumentSchema } from '@easyink/schema'
import { SCHEMA_VERSION } from '@easyink/shared'

export interface SampleTemplateEntry {
  id: string
  name: string
  category: string
  thumbnail?: string
  schema: DocumentSchema
}

/**
 * A4 blank template.
 */
export const blankA4Template: DocumentSchema = {
  version: SCHEMA_VERSION,
  unit: 'mm',
  page: {
    mode: 'fixed',
    width: 210,
    height: 297,
  },
  guides: { x: [], y: [] },
  elements: [],
}

/**
 * Simple invoice template with header text and a data table placeholder.
 */
export const simpleInvoiceTemplate: DocumentSchema = {
  version: SCHEMA_VERSION,
  unit: 'mm',
  page: {
    mode: 'fixed',
    width: 210,
    height: 297,
  },
  guides: { x: [], y: [] },
  elements: [
    {
      id: 'invoice_title',
      type: 'text',
      x: 60,
      y: 15,
      width: 90,
      height: 12,
      props: {
        content: 'INVOICE',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        color: '#333333',
      },
    },
    {
      id: 'invoice_date',
      type: 'text',
      x: 140,
      y: 35,
      width: 60,
      height: 6,
      props: {
        content: 'Date: ____',
        fontSize: 10,
        textAlign: 'right',
        verticalAlign: 'middle',
        color: '#666666',
      },
    },
    {
      id: 'invoice_no',
      type: 'text',
      x: 10,
      y: 35,
      width: 60,
      height: 6,
      props: {
        content: 'No: ____',
        fontSize: 10,
        textAlign: 'left',
        verticalAlign: 'middle',
        color: '#666666',
      },
    },
  ],
}

/**
 * Label template (multi-column).
 */
export const labelTemplate: DocumentSchema = {
  version: SCHEMA_VERSION,
  unit: 'mm',
  page: {
    mode: 'label',
    width: 210,
    height: 40,
    label: {
      columns: 3,
      gap: 2,
    },
    copies: 9,
  },
  guides: { x: [], y: [] },
  elements: [
    {
      id: 'label_barcode',
      type: 'barcode',
      x: 5,
      y: 5,
      width: 55,
      height: 20,
      props: {
        value: '1234567890',
        format: 'CODE128',
        showText: true,
      },
    },
    {
      id: 'label_name',
      type: 'text',
      x: 5,
      y: 27,
      width: 55,
      height: 6,
      props: {
        content: 'Product Name',
        fontSize: 9,
        textAlign: 'center',
      },
    },
  ],
}

/**
 * Receipt template (stack mode).
 */
export const receiptTemplate: DocumentSchema = {
  version: SCHEMA_VERSION,
  unit: 'mm',
  page: {
    mode: 'stack',
    width: 80,
    height: 200,
  },
  guides: { x: [], y: [] },
  elements: [
    {
      id: 'receipt_header',
      type: 'text',
      x: 5,
      y: 5,
      width: 70,
      height: 8,
      props: {
        content: 'RECEIPT',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    },
    {
      id: 'receipt_line',
      type: 'line',
      x: 5,
      y: 16,
      width: 70,
      height: 0,
      props: {
        lineWidth: 1,
        lineColor: '#000000',
        lineType: 'dashed',
      },
    },
  ],
}

/**
 * Demo data for invoice.
 */
export const invoiceDemoData = {
  company: {
    name: 'Acme Corp',
    address: '123 Business Street',
  },
  invoice: {
    number: 'INV-2026-001',
    date: '2026-04-05',
  },
  items: [
    { name: 'Widget A', qty: 10, price: 25.00 },
    { name: 'Widget B', qty: 5, price: 40.00 },
    { name: 'Service C', qty: 1, price: 150.00 },
  ],
  total: 600.00,
}

/**
 * All sample templates.
 */
export const sampleTemplates: SampleTemplateEntry[] = [
  {
    id: 'blank-a4',
    name: 'Blank A4',
    category: 'basic',
    schema: blankA4Template,
  },
  {
    id: 'simple-invoice',
    name: 'Simple Invoice',
    category: 'business',
    schema: simpleInvoiceTemplate,
  },
  {
    id: 'label-3col',
    name: 'Label (3-column)',
    category: 'label',
    schema: labelTemplate,
  },
  {
    id: 'receipt',
    name: 'Receipt',
    category: 'receipt',
    schema: receiptTemplate,
  },
]
