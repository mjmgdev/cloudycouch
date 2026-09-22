/**
 * Realistic Mock Data for IBM Cloudant Web UI
 * Provides an interactive sandbox when no live Cloudant credentials are supplied or in demo mode.
 */

export const mockDatabases = [
  {
    name: 'ecommerce_products',
    doc_count: 6,
    doc_del_count: 0,
    disk_size: 49152,
    partitioned: false,
    indexes: [
      { ddoc: '_design/category-index', name: 'by-category', def: { fields: ['category'] } },
      { ddoc: '_design/price-index', name: 'by-price', def: { fields: ['price'] } }
    ],
    docs: [
      {
        _id: 'prod_001',
        _rev: '1-a83f98c42b109e4',
        name: 'Ergonomic Mechanical Keyboard',
        category: 'Electronics',
        price: 149.99,
        in_stock: true,
        stock_count: 42,
        tags: ['peripheral', 'rgb', 'wireless'],
        rating: 4.8,
        manufacturer: {
          name: 'ApexKeyboards',
          country: 'Germany'
        },
        created_at: '2025-01-15T08:30:00Z',
        updated_at: '2025-02-10T14:22:15Z'
      },
      {
        _id: 'prod_002',
        _rev: '2-9b2e71d38a0f91a',
        name: 'Ultra-Wide 34" Curved Monitor',
        category: 'Electronics',
        price: 499.50,
        in_stock: true,
        stock_count: 15,
        tags: ['display', 'hdr', '4k'],
        rating: 4.6,
        manufacturer: {
          name: 'VisionTech',
          country: 'South Korea'
        },
        created_at: '2025-01-18T10:15:00Z',
        updated_at: '2025-02-05T09:40:00Z'
      },
      {
        _id: 'prod_003',
        _rev: '1-3c4d5e6f7a8b9c0',
        name: 'Active Noise Cancelling Headphones',
        category: 'Audio',
        price: 229.00,
        in_stock: false,
        stock_count: 0,
        tags: ['bluetooth', 'anc', 'audio'],
        rating: 4.9,
        manufacturer: {
          name: 'SoundWave Labs',
          country: 'Japan'
        },
        created_at: '2025-01-20T12:00:00Z',
        updated_at: '2025-02-14T18:10:20Z'
      },
      {
        _id: 'prod_004',
        _rev: '3-7f8e9d0a1b2c3d4',
        name: 'Standing Desk Converter with Dual Gas Spring',
        category: 'Furniture',
        price: 189.95,
        in_stock: true,
        stock_count: 28,
        tags: ['office', 'ergonomics', 'desk'],
        rating: 4.7,
        manufacturer: {
          name: 'ErgoComfort',
          country: 'USA'
        },
        created_at: '2025-01-25T11:45:00Z',
        updated_at: '2025-02-12T16:05:00Z'
      },
      {
        _id: 'prod_005',
        _rev: '1-5e6f7a8b9c0d1e2',
        name: 'Aluminum USB-C Multiport Hub 10-in-1',
        category: 'Electronics',
        price: 69.99,
        in_stock: true,
        stock_count: 85,
        tags: ['accessories', 'adapter', 'usb-c'],
        rating: 4.5,
        manufacturer: {
          name: 'ApexKeyboards',
          country: 'Germany'
        },
        created_at: '2025-02-01T09:00:00Z',
        updated_at: '2025-02-01T09:00:00Z'
      },
      {
        _id: 'prod_006',
        _rev: '1-1a2b3c4d5e6f7a8',
        name: 'Smart Ambient LED Light Bar',
        category: 'Home & Living',
        price: 45.00,
        in_stock: true,
        stock_count: 110,
        tags: ['smart-home', 'lighting', 'wifi'],
        rating: 4.4,
        manufacturer: {
          name: 'LuminaGlow',
          country: 'Sweden'
        },
        created_at: '2025-02-04T15:20:00Z',
        updated_at: '2025-02-18T11:00:00Z'
      }
    ]
  },
  {
    name: 'customer_profiles',
    doc_count: 4,
    doc_del_count: 0,
    disk_size: 32768,
    partitioned: false,
    indexes: [
      { ddoc: '_design/email-index', name: 'by-email', def: { fields: ['email'] } }
    ],
    docs: [
      {
        _id: 'user_alex_m',
        _rev: '1-fa2b3c4d5e',
        email: 'alex.morgan@example.com',
        full_name: 'Alex Morgan',
        membership_tier: 'Platinum',
        loyalty_points: 12450,
        is_active: true,
        shipping_address: {
          city: 'Seattle',
          state: 'WA',
          country: 'USA'
        },
        registered_at: '2024-03-12T14:00:00Z'
      },
      {
        _id: 'user_elena_r',
        _rev: '2-1b2c3d4e5f',
        email: 'elena.rostova@example.com',
        full_name: 'Elena Rostova',
        membership_tier: 'Gold',
        loyalty_points: 6800,
        is_active: true,
        shipping_address: {
          city: 'Toronto',
          state: 'ON',
          country: 'Canada'
        },
        registered_at: '2024-07-22T09:30:00Z'
      },
      {
        _id: 'user_kenji_s',
        _rev: '1-8c9d0e1f2a',
        email: 'kenji.sato@example.jp',
        full_name: 'Kenji Sato',
        membership_tier: 'Silver',
        loyalty_points: 2100,
        is_active: true,
        shipping_address: {
          city: 'Tokyo',
          state: 'Kanto',
          country: 'Japan'
        },
        registered_at: '2024-11-05T18:15:00Z'
      },
      {
        _id: 'user_sophia_l',
        _rev: '1-4d5e6f7a8b',
        email: 'sophia.laurent@example.fr',
        full_name: 'Sophia Laurent',
        membership_tier: 'Bronze',
        loyalty_points: 450,
        is_active: false,
        shipping_address: {
          city: 'Lyon',
          state: 'Auvergne-Rhône-Alpes',
          country: 'France'
        },
        registered_at: '2025-01-02T11:10:00Z'
      }
    ]
  },
  {
    name: 'system_telemetry',
    doc_count: 3,
    doc_del_count: 0,
    disk_size: 24576,
    partitioned: true,
    indexes: [],
    docs: [
      {
        _id: 'eu-west:node-01:20250220',
        _rev: '1-1122334455',
        region: 'eu-west',
        node: 'node-01',
        cpu_usage_pct: 34.2,
        memory_usage_pct: 68.5,
        requests_per_sec: 1420,
        status: 'healthy',
        timestamp: '2025-02-20T10:00:00Z'
      },
      {
        _id: 'eu-west:node-02:20250220',
        _rev: '1-2233445566',
        region: 'eu-west',
        node: 'node-02',
        cpu_usage_pct: 78.9,
        memory_usage_pct: 82.1,
        requests_per_sec: 2890,
        status: 'warning',
        timestamp: '2025-02-20T10:00:00Z'
      },
      {
        _id: 'us-east:node-01:20250220',
        _rev: '1-3344556677',
        region: 'us-east',
        node: 'node-01',
        cpu_usage_pct: 42.1,
        memory_usage_pct: 55.4,
        requests_per_sec: 1980,
        status: 'healthy',
        timestamp: '2025-02-20T10:00:00Z'
      }
    ]
  },
  {
    name: 'proj_alpha_2025-07',
    doc_count: 980,
    doc_del_count: 14,
    disk_size: 10485760,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2025-08',
    doc_count: 1120,
    doc_del_count: 20,
    disk_size: 12582912,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2025-09',
    doc_count: 1340,
    doc_del_count: 25,
    disk_size: 14680064,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2025-10',
    doc_count: 1560,
    doc_del_count: 30,
    disk_size: 16777216,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2025-11',
    doc_count: 1780,
    doc_del_count: 35,
    disk_size: 18874368,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2025-12',
    doc_count: 1900,
    doc_del_count: 40,
    disk_size: 20971520,
    partitioned: true,
    indexes: [],
    docs: []
  },
  {
    name: 'proj_alpha_2026-01',
    doc_count: 1450,
    doc_del_count: 32,
    disk_size: 15728640,
    partitioned: true,
    indexes: [],
    docs: [
      { _id: 'alpha:task_001', title: 'Sprint planning Jan', status: 'completed' },
      { _id: 'alpha:task_002', title: 'Database schema migration', status: 'completed' }
    ]
  },
  {
    name: 'proj_alpha_2026-02',
    doc_count: 2100,
    doc_del_count: 48,
    disk_size: 23068672,
    partitioned: true,
    indexes: [],
    docs: [
      { _id: 'alpha:task_101', title: 'Sprint planning Feb', status: 'completed' }
    ]
  },
  {
    name: 'proj_alpha_2026-03',
    doc_count: 890,
    doc_del_count: 12,
    disk_size: 9437184,
    partitioned: true,
    indexes: [],
    docs: [
      { _id: 'alpha:task_201', title: 'Current Sprint Mar', status: 'in-progress' }
    ]
  },
  {
    name: 'proj_beta_2026-01',
    doc_count: 4500,
    doc_del_count: 120,
    disk_size: 47185920,
    partitioned: false,
    indexes: [],
    docs: [
      { _id: 'beta_log_001', event: 'checkout_success', amount: 89.99 }
    ]
  },
  {
    name: 'proj_beta_2026-02',
    doc_count: 6200,
    doc_del_count: 210,
    disk_size: 68157440,
    partitioned: false,
    indexes: [],
    docs: [
      { _id: 'beta_log_101', event: 'checkout_success', amount: 149.00 }
    ]
  },
  {
    name: 'customer_logs_2025',
    doc_count: 12000,
    doc_del_count: 850,
    disk_size: 134217728,
    partitioned: false,
    indexes: [],
    docs: [
      { _id: 'log_archive_01', level: 'info', message: 'Annual archive log' }
    ]
  }
];

