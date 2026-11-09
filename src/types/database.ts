export type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

export interface Factory {
  id: string
  organization_id: string
  name: string
  address: string | null
  gstin: string | null
  created_at: string
}

export interface Customer {
  id: string
  organization_id: string
  name: string
  phone: string | null
  email: string | null
  gstin: string | null
  address: string | null
  created_at: string
}

export type JobOrderStatus = 'received' | 'in_production' | 'completed' | 'dispatched' | 'cancelled'

export interface JobOrder {
  id: string
  organization_id: string
  factory_id: string | null
  customer_id: string
  order_number: string
  fabric_type: string
  received_weight_kg: number
  expected_delivery_date: string | null
  status: JobOrderStatus
  notes: string | null
  created_at: string
}
