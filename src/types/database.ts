export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      boiler_logs: {
        Row: {
          boiler_operating_hours: number
          created_at: string
          fabric_processed_kg: number
          factory_id: string
          firewood_consumed_kg: number
          fuel_cost: number
          id: string
          log_date: string
          notes: string | null
          organization_id: string
          steam_generated_kg: number | null
        }
        Insert: {
          boiler_operating_hours?: number
          created_at?: string
          fabric_processed_kg: number
          factory_id: string
          firewood_consumed_kg: number
          fuel_cost?: number
          id?: string
          log_date?: string
          notes?: string | null
          organization_id: string
          steam_generated_kg?: number | null
        }
        Update: {
          boiler_operating_hours?: number
          created_at?: string
          fabric_processed_kg?: number
          factory_id?: string
          firewood_consumed_kg?: number
          fuel_cost?: number
          id?: string
          log_date?: string
          notes?: string | null
          organization_id?: string
          steam_generated_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boiler_logs_factory_org_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "boiler_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          date_of_joining: string
          designation: string
          employee_code: string
          factory_id: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string
          phone: string | null
          salary_rate: number
          salary_type: string
        }
        Insert: {
          created_at?: string
          date_of_joining?: string
          designation: string
          employee_code: string
          factory_id: string
          full_name: string
          id?: string
          is_active?: boolean
          organization_id: string
          phone?: string | null
          salary_rate: number
          salary_type?: string
        }
        Update: {
          created_at?: string
          date_of_joining?: string
          designation?: string
          employee_code?: string
          factory_id?: string
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          phone?: string | null
          salary_rate?: number
          salary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_factory_org_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          }
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          employee_id: string
          factory_id: string
          id: string
          notes: string | null
          organization_id: string
          overtime_hours: number
          status: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          employee_id: string
          factory_id: string
          id?: string
          notes?: string | null
          organization_id: string
          overtime_hours?: number
          status: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          employee_id?: string
          factory_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          overtime_hours?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_scope_fk"
            columns: ["employee_id", "organization_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "organization_id", "factory_id"]
          }
        ]
      }
      account_invoices: {
        Row: {
          created_at: string
          due_date: string | null
          factory_id: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          organization_id: string
          party_name: string
          party_type: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          factory_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          notes?: string | null
          organization_id: string
          party_name: string
          party_type: string
          subtotal: number
          tax_amount?: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          factory_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          organization_id?: string
          party_name?: string
          party_type?: string
          subtotal?: number
          tax_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_invoices_factory_org_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "account_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      account_payments: {
        Row: {
          amount: number
          created_at: string
          factory_id: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_mode: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          factory_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_mode?: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          factory_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_mode?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_payments_invoice_scope_fk"
            columns: ["invoice_id", "organization_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "account_invoices"
            referencedColumns: ["id", "organization_id", "factory_id"]
          }
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          created_at: string
          delivery_note_number: string | null
          dispatch_date: string
          id: string
          job_order_id: string
          notes: string | null
          organization_id: string
          vehicle_number: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          delivery_note_number?: string | null
          dispatch_date?: string
          id?: string
          job_order_id: string
          notes?: string | null
          organization_id: string
          vehicle_number?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          delivery_note_number?: string | null
          dispatch_date?: string
          id?: string
          job_order_id?: string
          notes?: string | null
          organization_id?: string
          vehicle_number?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          organization_id: string
          payment_mode: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          organization_id: string
          payment_mode?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          organization_id?: string
          payment_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          address: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          factory_id: string
          id: string
          item_name: string
          organization_id: string
          reorder_level: number
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          factory_id: string
          id?: string
          item_name: string
          organization_id: string
          reorder_level?: number
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          factory_id?: string
          id?: string
          item_name?: string
          organization_id?: string
          reorder_level?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_factory_org_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          item_id: string
          notes: string | null
          organization_id: string
          quantity: number
          reference_purchase_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          item_id: string
          notes?: string | null
          organization_id: string
          quantity: number
          reference_purchase_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          reference_purchase_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_scope_fk"
            columns: ["item_id", "organization_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id", "organization_id", "factory_id"]
          },
          {
            foreignKeyName: "inventory_transactions_reference_purchase_id_fkey"
            columns: ["reference_purchase_id"]
            isOneToOne: true
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          created_at: string
          customer_id: string
          expected_delivery_date: string | null
          fabric_type: string
          factory_id: string | null
          id: string
          notes: string | null
          order_number: string
          organization_id: string
          received_weight_kg: number
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expected_delivery_date?: string | null
          fabric_type: string
          factory_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          organization_id: string
          received_weight_kg: number
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expected_delivery_date?: string | null
          fabric_type?: string
          factory_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          organization_id?: string
          received_weight_kg?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          gstin: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          gstin?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          gstin?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      production_entries: {
        Row: {
          created_at: string
          factory_id: string | null
          id: string
          input_weight_kg: number
          job_order_id: string
          machine_name: string | null
          notes: string | null
          organization_id: string
          output_weight_kg: number
          production_date: string
          shift: string | null
        }
        Insert: {
          created_at?: string
          factory_id?: string | null
          id?: string
          input_weight_kg: number
          job_order_id: string
          machine_name?: string | null
          notes?: string | null
          organization_id: string
          output_weight_kg: number
          production_date?: string
          shift?: string | null
        }
        Update: {
          created_at?: string
          factory_id?: string | null
          id?: string
          input_weight_kg?: number
          job_order_id?: string
          machine_name?: string | null
          notes?: string | null
          organization_id?: string
          output_weight_kg?: number
          production_date?: string
          shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          installation_date: string | null
          machine_code: string
          machine_name: string
          machine_type: string
          manufacturer: string | null
          model: string | null
          notes: string | null
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          installation_date?: string | null
          machine_code: string
          machine_name: string
          machine_type?: string
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          installation_date?: string | null
          machine_code?: string
          machine_name?: string
          machine_type?: string
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_factory_scope_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "machines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_maintenance_logs: {
        Row: {
          created_at: string
          downtime_hours: number
          factory_id: string
          id: string
          issue_reported: string | null
          machine_id: string
          maintenance_cost: number
          maintenance_date: string
          maintenance_number: string
          maintenance_type: string
          next_service_date: string | null
          notes: string | null
          organization_id: string
          status: string
          technician_name: string | null
          work_performed: string | null
        }
        Insert: {
          created_at?: string
          downtime_hours?: number
          factory_id: string
          id?: string
          issue_reported?: string | null
          machine_id: string
          maintenance_cost?: number
          maintenance_date?: string
          maintenance_number: string
          maintenance_type?: string
          next_service_date?: string | null
          notes?: string | null
          organization_id: string
          status?: string
          technician_name?: string | null
          work_performed?: string | null
        }
        Update: {
          created_at?: string
          downtime_hours?: number
          factory_id?: string
          id?: string
          issue_reported?: string | null
          machine_id?: string
          maintenance_cost?: number
          maintenance_date?: string
          maintenance_number?: string
          maintenance_type?: string
          next_service_date?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
          technician_name?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_maintenance_factory_scope_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "machine_maintenance_machine_scope_fk"
            columns: ["machine_id", "organization_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id", "organization_id", "factory_id"]
          },
          {
            foreignKeyName: "machine_maintenance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          accepted_weight_kg: number
          created_at: string
          defect_type: string | null
          factory_id: string
          fabric_width_cm: number | null
          gsm: number | null
          id: string
          inspected_by: string | null
          inspected_weight_kg: number
          inspection_date: string
          inspection_number: string
          inspection_stage: string
          job_order_id: string
          notes: string | null
          organization_id: string
          rejected_weight_kg: number
          shrinkage_percent: number | null
          status: string
        }
        Insert: {
          accepted_weight_kg?: number
          created_at?: string
          defect_type?: string | null
          factory_id: string
          fabric_width_cm?: number | null
          gsm?: number | null
          id?: string
          inspected_by?: string | null
          inspected_weight_kg: number
          inspection_date?: string
          inspection_number: string
          inspection_stage?: string
          job_order_id: string
          notes?: string | null
          organization_id: string
          rejected_weight_kg?: number
          shrinkage_percent?: number | null
          status?: string
        }
        Update: {
          accepted_weight_kg?: number
          created_at?: string
          defect_type?: string | null
          factory_id?: string
          fabric_width_cm?: number | null
          gsm?: number | null
          id?: string
          inspected_by?: string | null
          inspected_weight_kg?: number
          inspection_date?: string
          inspection_number?: string
          inspection_stage?: string
          job_order_id?: string
          notes?: string | null
          organization_id?: string
          rejected_weight_kg?: number
          shrinkage_percent?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_factory_scope_fk"
            columns: ["factory_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "quality_inspections_job_scope_fk"
            columns: ["job_order_id", "organization_id", "factory_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id", "organization_id", "factory_id"]
          },
          {
            foreignKeyName: "quality_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          category: string
          created_at: string
          factory_id: string
          gst_amount: number | null
          gst_percent: number
          id: string
          invoice_number: string | null
          item_name: string
          notes: string | null
          organization_id: string
          payment_mode: string | null
          purchase_date: string
          quantity: number
          subtotal: number | null
          supplier_name: string
          supplier_phone: string | null
          total_amount: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          category: string
          created_at?: string
          factory_id: string
          gst_amount?: number | null
          gst_percent?: number
          id?: string
          invoice_number?: string | null
          item_name: string
          notes?: string | null
          organization_id: string
          payment_mode?: string | null
          purchase_date?: string
          quantity: number
          subtotal?: number | null
          supplier_name: string
          supplier_phone?: string | null
          total_amount?: number | null
          unit?: string
          unit_price: number
        }
        Update: {
          category?: string
          created_at?: string
          factory_id?: string
          gst_amount?: number | null
          gst_percent?: number
          id?: string
          invoice_number?: string | null
          item_name?: string
          notes?: string | null
          organization_id?: string
          payment_mode?: string | null
          purchase_date?: string
          quantity?: number
          subtotal?: number | null
          supplier_name?: string
          supplier_phone?: string | null
          total_amount?: number | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
