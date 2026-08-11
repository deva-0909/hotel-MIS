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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          employee_id: string
          id: string
          status: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          employee_id: string
          id?: string
          status: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_restrictions: {
        Row: {
          closed_to_arrival: boolean
          closed_to_departure: boolean
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          max_stay: number | null
          min_stay: number | null
          notes: string | null
          property_id: string
          room_type_id: string
          start_date: string
          stop_sell: boolean
        }
        Insert: {
          closed_to_arrival?: boolean
          closed_to_departure?: boolean
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          max_stay?: number | null
          min_stay?: number | null
          notes?: string | null
          property_id: string
          room_type_id: string
          start_date: string
          stop_sell?: boolean
        }
        Update: {
          closed_to_arrival?: boolean
          closed_to_departure?: boolean
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          max_stay?: number | null
          min_stay?: number | null
          notes?: string | null
          property_id?: string
          room_type_id?: string
          start_date?: string
          stop_sell?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "availability_restrictions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_restrictions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_restrictions_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      banquet_event_items: {
        Row: {
          covers: number
          created_at: string
          event_id: string
          id: string
          notes: string | null
          package_id: string
        }
        Insert: {
          covers?: number
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          package_id: string
        }
        Update: {
          covers?: number
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banquet_event_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "banquet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banquet_event_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "banquet_menu_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      banquet_events: {
        Row: {
          client_name: string
          covers: number
          created_at: string
          end_at: string
          event_name: string
          id: string
          property_id: string
          start_at: string
          status: string
          value_amount: number
          venue_id: string | null
        }
        Insert: {
          client_name: string
          covers?: number
          created_at?: string
          end_at: string
          event_name: string
          id?: string
          property_id: string
          start_at: string
          status?: string
          value_amount?: number
          venue_id?: string | null
        }
        Update: {
          client_name?: string
          covers?: number
          created_at?: string
          end_at?: string
          event_name?: string
          id?: string
          property_id?: string
          start_at?: string
          status?: string
          value_amount?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banquet_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banquet_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "banquet_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      banquet_menu_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price_per_cover: number
          property_id: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_per_cover?: number
          property_id: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_per_cover?: number
          property_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banquet_menu_packages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banquet_menu_packages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "corporate_banquet_package_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      banquet_venues: {
        Row: {
          buffer_minutes: number
          capacity: number
          id: string
          name: string
          property_id: string
        }
        Insert: {
          buffer_minutes?: number
          capacity?: number
          id?: string
          name: string
          property_id: string
        }
        Update: {
          buffer_minutes?: number
          capacity?: number
          id?: string
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banquet_venues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_number: string
          booking_type: string
          channel_connection_id: string | null
          commission_percent: number | null
          company_id: string | null
          created_at: string
          created_by: string | null
          external_booking_id: string | null
          guest_id: string
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["booking_source"]
          travel_agent_id: string | null
        }
        Insert: {
          booking_number?: string
          booking_type?: string
          channel_connection_id?: string | null
          commission_percent?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          external_booking_id?: string | null
          guest_id: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          travel_agent_id?: string | null
        }
        Update: {
          booking_number?: string
          booking_type?: string
          channel_connection_id?: string | null
          commission_percent?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          external_booking_id?: string | null
          guest_id?: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          travel_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_travel_agent_id_fkey"
            columns: ["travel_agent_id"]
            isOneToOne: false
            referencedRelation: "travel_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          created_at: string
          id: string
          name: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_connections: {
        Row: {
          api_key: string | null
          api_secret: string | null
          channel_id: string
          created_at: string
          created_by: string | null
          external_property_id: string | null
          ical_export_token: string
          ical_import_url: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          property_id: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          channel_id: string
          created_at?: string
          created_by?: string | null
          external_property_id?: string | null
          ical_export_token?: string
          ical_import_url?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          property_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          channel_id?: string
          created_at?: string
          created_by?: string | null
          external_property_id?: string | null
          ical_export_token?: string
          ical_import_url?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          property_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_connections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_rate_plan_map: {
        Row: {
          channel_connection_id: string
          created_at: string
          external_rate_plan_id: string
          external_room_type_id: string | null
          id: string
          is_active: boolean
          rate_plan_id: string
        }
        Insert: {
          channel_connection_id: string
          created_at?: string
          external_rate_plan_id: string
          external_room_type_id?: string | null
          id?: string
          is_active?: boolean
          rate_plan_id: string
        }
        Update: {
          channel_connection_id?: string
          created_at?: string
          external_rate_plan_id?: string
          external_room_type_id?: string | null
          id?: string
          is_active?: boolean
          rate_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_rate_plan_map_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_rate_plan_map_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "rate_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_sync_log: {
        Row: {
          channel_connection_id: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          payload_summary: string | null
          retry_count: number
          status: string
          sync_type: string
        }
        Insert: {
          channel_connection_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          payload_summary?: string | null
          retry_count?: number
          status: string
          sync_type: string
        }
        Update: {
          channel_connection_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          payload_summary?: string | null
          retry_count?: number
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_sync_log_channel_connection_id_fkey"
            columns: ["channel_connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          code: string
          id: string
          name: string
          supports_api: boolean
          supports_ical: boolean
        }
        Insert: {
          code: string
          id?: string
          name: string
          supports_api?: boolean
          supports_ical?: boolean
        }
        Update: {
          code?: string
          id?: string
          name?: string
          supports_api?: boolean
          supports_ical?: boolean
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          property_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          property_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          billing_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          billing_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      config_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          property_id: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          property_id?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          property_id?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_audit_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_banquet_package_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price_per_cover: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_per_cover?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_per_cover?: number
        }
        Relationships: []
      }
      corporate_menu_category_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      corporate_room_type_templates: {
        Row: {
          amenities: string | null
          base_rate: number
          created_at: string
          description: string | null
          id: string
          max_occupancy: number
          name: string
        }
        Insert: {
          amenities?: string | null
          base_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          max_occupancy?: number
          name: string
        }
        Update: {
          amenities?: string | null
          base_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          max_occupancy?: number
          name?: string
        }
        Relationships: []
      }
      crm_campaigns: {
        Row: {
          audience: string
          channel: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          property_id: string
          start_date: string | null
          status: string
        }
        Insert: {
          audience: string
          channel: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          property_id: string
          start_date?: string | null
          status?: string
        }
        Update: {
          audience?: string
          channel?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          property_id?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          created_at: string
          id: string
          name: string
          property_id: string
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          property_id: string
          source?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          property_id?: string
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          identifier: string | null
          is_active: boolean
          kitchen_id: string | null
          name: string
          property_id: string
          restaurant_id: string | null
          service_area_id: string | null
        }
        Insert: {
          created_at?: string
          device_type: Database["public"]["Enums"]["device_type"]
          id?: string
          identifier?: string | null
          is_active?: boolean
          kitchen_id?: string | null
          name: string
          property_id: string
          restaurant_id?: string | null
          service_area_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          identifier?: string | null
          is_active?: boolean
          kitchen_id?: string | null
          name?: string
          property_id?: string
          restaurant_id?: string | null
          service_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_assets: {
        Row: {
          asset_code: string
          category: string
          created_at: string
          id: string
          location: string | null
          name: string
          next_service_date: string | null
          property_id: string
          status: string
        }
        Insert: {
          asset_code?: string
          category: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          next_service_date?: string | null
          property_id: string
          status?: string
        }
        Update: {
          asset_code?: string
          category?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          next_service_date?: string | null
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineering_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      folio_charges: {
        Row: {
          amount: number
          charge_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          reservation_id: string
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          amount: number
          charge_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reservation_id: string
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          amount?: number
          charge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reservation_id?: string
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folio_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folio_charges_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_communications: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          guest_id: string
          id: string
          notes: string | null
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          direction?: string
          guest_id: string
          id?: string
          notes?: string | null
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          guest_id?: string
          id?: string
          notes?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_communications_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_documents: {
        Row: {
          document_type: string
          file_name: string
          file_path: string
          guest_id: string
          id: string
          reservation_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_path: string
          guest_id: string
          id?: string
          reservation_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_path?: string
          guest_id?: string
          id?: string
          reservation_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_documents_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_feedback: {
        Row: {
          category: string | null
          comments: string | null
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          rating: number | null
          reservation_id: string | null
        }
        Insert: {
          category?: string | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          rating?: number | null
          reservation_id?: string | null
        }
        Update: {
          category?: string | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          rating?: number | null
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_feedback_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_requests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          guest_id: string
          id: string
          priority: string
          property_id: string | null
          request_type: string
          reservation_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          guest_id: string
          id?: string
          priority?: string
          property_id?: string | null
          request_type: string
          reservation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          guest_id?: string
          id?: string
          priority?: string
          property_id?: string | null
          request_type?: string
          reservation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          anniversary_date: string | null
          company_id: string | null
          consent_call: boolean
          consent_email: boolean
          consent_marketing: boolean
          consent_sms: boolean
          consent_updated_at: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          food_preferences: string | null
          full_name: string
          id: string
          id_proof_number: string | null
          id_proof_type: string | null
          loyalty_points: number
          loyalty_tier: string | null
          nationality: string | null
          notes: string | null
          passport_country: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          preferences: string | null
          room_preferences: string | null
          updated_at: string
          visa_expiry: string | null
          visa_number: string | null
        }
        Insert: {
          address?: string | null
          anniversary_date?: string | null
          company_id?: string | null
          consent_call?: boolean
          consent_email?: boolean
          consent_marketing?: boolean
          consent_sms?: boolean
          consent_updated_at?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          food_preferences?: string | null
          full_name: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferences?: string | null
          room_preferences?: string | null
          updated_at?: string
          visa_expiry?: string | null
          visa_number?: string | null
        }
        Update: {
          address?: string | null
          anniversary_date?: string | null
          company_id?: string | null
          consent_call?: boolean
          consent_email?: boolean
          consent_marketing?: boolean
          consent_sms?: boolean
          consent_updated_at?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          food_preferences?: string | null
          full_name?: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          nationality?: string | null
          notes?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferences?: string | null
          room_preferences?: string | null
          updated_at?: string
          visa_expiry?: string | null
          visa_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_settings: {
        Row: {
          city: string | null
          corporate_name: string
          gstin: string | null
          hotel_name: string
          id: string
          region_name: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          corporate_name?: string
          gstin?: string | null
          hotel_name?: string
          id?: string
          region_name?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          corporate_name?: string
          gstin?: string | null
          hotel_name?: string
          id?: string
          region_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          attendant: string | null
          created_at: string
          id: string
          priority: string | null
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attendant?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attendant?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          created_at: string
          department: string
          email: string | null
          employee_code: string
          full_name: string
          id: string
          phone: string | null
          role_title: string | null
          status: string
        }
        Insert: {
          created_at?: string
          department: string
          email?: string | null
          employee_code?: string
          full_name: string
          id?: string
          phone?: string | null
          role_title?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          phone?: string | null
          role_title?: string | null
          status?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          name: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          source_id: string | null
          source_table: string | null
          source_type: string
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          source_id?: string | null
          source_table?: string | null
          source_type: string
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          source_id?: string | null
          source_table?: string | null
          source_type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          bill_to: string
          booking_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          guest_id: string
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          order_id: string | null
          property_id: string
          refunded_amount: number
          reservation_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          travel_agent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          bill_to?: string
          booking_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          guest_id: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          order_id?: string | null
          property_id: string
          refunded_amount?: number
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          travel_agent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          bill_to?: string
          booking_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          guest_id?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          order_id?: string | null
          property_id?: string
          refunded_amount?: number
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          travel_agent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_travel_agent_id_fkey"
            columns: ["travel_agent_id"]
            isOneToOne: false
            referencedRelation: "travel_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          property_id: string
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_number?: string
          id?: string
          property_id: string
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          property_id?: string
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_properties: {
        Row: {
          kitchen_id: string
          property_id: string
        }
        Insert: {
          kitchen_id: string
          property_id: string
        }
        Update: {
          kitchen_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_properties_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchens: {
        Row: {
          created_at: string
          id: string
          is_central: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_central?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_central?: boolean
          name?: string
        }
        Relationships: []
      }
      laundry_batches: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          item_count: number
          property_id: string
          room_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          item_count?: number
          property_id: string
          room_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          item_count?: number
          property_id?: string
          room_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_batches_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_batches_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          kitchen_id: string | null
          name: string
          restaurant_id: string
          sort_order: number
          template_id: string | null
        }
        Insert: {
          id?: string
          kitchen_id?: string | null
          name: string
          restaurant_id: string
          sort_order?: number
          template_id?: string | null
        }
        Update: {
          id?: string
          kitchen_id?: string | null
          name?: string
          restaurant_id?: string
          sort_order?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "corporate_menu_category_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          aggregator_price: number | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          is_veg: boolean
          name: string
          own_delivery_price: number | null
          parcel_price: number | null
          price: number
        }
        Insert: {
          aggregator_price?: number | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          is_veg?: boolean
          name: string
          own_delivery_price?: number | null
          parcel_price?: number | null
          price?: number
        }
        Update: {
          aggregator_price?: number | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          is_veg?: boolean
          name?: string
          own_delivery_price?: number | null
          parcel_price?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          kot_sent_at: string | null
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_item_status"]
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          kot_sent_at?: string | null
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_item_status"]
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          kot_sent_at?: string | null
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_item_status"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bill_to_room: boolean
          created_at: string
          guest_id: string | null
          id: string
          notes: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          pos_terminal_id: string | null
          property_id: string
          reservation_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          updated_at: string
          waiter_id: string | null
        }
        Insert: {
          bill_to_room?: boolean
          created_at?: string
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          pos_terminal_id?: string | null
          property_id: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          updated_at?: string
          waiter_id?: string | null
        }
        Update: {
          bill_to_room?: boolean
          created_at?: string
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          pos_terminal_id?: string | null
          property_id?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          updated_at?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_terminal_id_fkey"
            columns: ["pos_terminal_id"]
            isOneToOne: false
            referencedRelation: "pos_terminals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_terminals: {
        Row: {
          created_at: string
          id: string
          identifier: string | null
          is_active: boolean
          name: string
          property_id: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier?: string | null
          is_active?: boolean
          name: string
          property_id: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string | null
          is_active?: boolean
          name?: string
          property_id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_terminals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_terminals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
          property_id: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          property_id?: string | null
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          property_id?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          booking_policy: Json
          city: string | null
          code: string
          created_at: string
          currency: string
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          timezone: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          address?: string | null
          booking_policy?: Json
          city?: string | null
          code: string
          created_at?: string
          currency?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          address?: string | null
          booking_policy?: Json
          city?: string | null
          code?: string
          created_at?: string
          currency?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Relationships: []
      }
      property_inventory: {
        Row: {
          current_stock: number
          inventory_item_id: string
          property_id: string
          reorder_level: number
        }
        Insert: {
          current_stock?: number
          inventory_item_id: string
          property_id: string
          reorder_level?: number
        }
        Update: {
          current_stock?: number
          inventory_item_id?: string
          property_id?: string
          reorder_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_inventory_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inventory_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          inventory_item_id: string
          po_id: string
          quantity: number
          received_quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          inventory_item_id: string
          po_id: string
          quantity: number
          received_quantity?: number
          unit_cost?: number
        }
        Update: {
          id?: string
          inventory_item_id?: string
          po_id?: string
          quantity?: number
          received_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          property_id: string
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          property_id: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          property_id?: string
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_plans: {
        Row: {
          base_rate: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          property_id: string
          room_type_id: string
        }
        Insert: {
          base_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          property_id: string
          room_type_id: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          property_id?: string
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_plans_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          id: string
          payment_id: string
          reason: string | null
          refunded_at: string
          refunded_by: string | null
        }
        Insert: {
          amount: number
          id?: string
          payment_id: string
          reason?: string | null
          refunded_at?: string
          refunded_by?: string | null
        }
        Update: {
          amount?: number
          id?: string
          payment_id?: string
          reason?: string | null
          refunded_at?: string
          refunded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_occupants: {
        Row: {
          age_category: string
          created_at: string
          full_name: string
          id: string
          id_proof_number: string | null
          id_proof_type: string | null
          reservation_id: string
        }
        Insert: {
          age_category?: string
          created_at?: string
          full_name: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          reservation_id: string
        }
        Update: {
          age_category?: string
          created_at?: string
          full_name?: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_occupants_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          actual_check_in_at: string | null
          actual_check_out_at: string | null
          adults: number
          booking_id: string | null
          check_in_date: string
          check_out_date: string
          children: number
          created_at: string
          created_by: string | null
          early_checkin: boolean
          guest_id: string
          id: string
          late_checkout: boolean
          notes: string | null
          property_id: string
          rate_per_night: number
          rate_plan_id: string | null
          reservation_number: string
          room_id: string | null
          room_type_id: string
          signature_path: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          actual_check_in_at?: string | null
          actual_check_out_at?: string | null
          adults?: number
          booking_id?: string | null
          check_in_date: string
          check_out_date: string
          children?: number
          created_at?: string
          created_by?: string | null
          early_checkin?: boolean
          guest_id: string
          id?: string
          late_checkout?: boolean
          notes?: string | null
          property_id: string
          rate_per_night?: number
          rate_plan_id?: string | null
          reservation_number?: string
          room_id?: string | null
          room_type_id: string
          signature_path?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          actual_check_in_at?: string | null
          actual_check_out_at?: string | null
          adults?: number
          booking_id?: string | null
          check_in_date?: string
          check_out_date?: string
          children?: number
          created_at?: string
          created_by?: string | null
          early_checkin?: boolean
          guest_id?: string
          id?: string
          late_checkout?: boolean
          notes?: string | null
          property_id?: string
          rate_per_night?: number
          rate_plan_id?: string | null
          reservation_number?: string
          room_id?: string | null
          room_type_id?: string
          signature_path?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "rate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          restaurant_id: string
          service_area_id: string | null
          status: Database["public"]["Enums"]["table_status"]
          table_number: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          restaurant_id: string
          service_area_id?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          table_number: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          restaurant_id?: string
          service_area_id?: string | null
          status?: Database["public"]["Enums"]["table_status"]
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          property_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          property_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: string | null
          base_rate: number
          created_at: string
          description: string | null
          id: string
          max_occupancy: number
          name: string
          property_id: string
          template_id: string | null
        }
        Insert: {
          amenities?: string | null
          base_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          max_occupancy?: number
          name: string
          property_id: string
          template_id?: string | null
        }
        Update: {
          amenities?: string | null
          base_rate?: number
          created_at?: string
          description?: string | null
          id?: string
          max_occupancy?: number
          name?: string
          property_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "corporate_room_type_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building_id: string
          created_at: string
          floor_id: string
          id: string
          notes: string | null
          property_id: string
          room_number: string
          room_type_id: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          floor_id: string
          id?: string
          notes?: string | null
          property_id: string
          room_number: string
          room_type_id: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          floor_id?: string
          id?: string
          notes?: string | null
          property_id?: string
          room_number?: string
          room_type_id?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_bookings: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          property_id: string
          scheduled_at: string
          service_id: string
          status: string
          therapist: string | null
          walk_in_name: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          property_id: string
          scheduled_at: string
          service_id: string
          status?: string
          therapist?: string | null
          walk_in_name?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          property_id?: string
          scheduled_at?: string
          service_id?: string
          status?: string
          therapist?: string | null
          walk_in_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "spa_services"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_services: {
        Row: {
          duration_minutes: number
          id: string
          name: string
          price: number
          property_id: string
        }
        Insert: {
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          property_id: string
        }
        Update: {
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spa_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          property_id: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          property_id?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          property_id?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          property_id: string
          quantity: number
          reference_id: string | null
          reference_table: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          property_id: string
          quantity: number
          reference_id?: string | null
          reference_table?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          property_id?: string
          quantity?: number
          reference_id?: string | null
          reference_table?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          inventory_item_id: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          id?: string
          inventory_item_id: string
          quantity: number
          transfer_id: string
        }
        Update: {
          id?: string
          inventory_item_id?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_property_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_property_id: string
          transfer_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_property_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_property_id: string
          transfer_number?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_property_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_property_id?: string
          transfer_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_property_id_fkey"
            columns: ["from_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_property_id_fkey"
            columns: ["to_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          current_stock: number
          inventory_item_id: string
          store_id: string
        }
        Insert: {
          current_stock?: number
          inventory_item_id: string
          store_id: string
        }
        Update: {
          current_stock?: number
          inventory_item_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          applies_to: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          property_id: string
          rate_percent: number
        }
        Insert: {
          applies_to: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          property_id: string
          rate_percent: number
        }
        Update: {
          applies_to?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          property_id?: string
          rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_agents: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_commission_percent: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_commission_percent?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_commission_percent?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      travel_bookings: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          property_id: string
          scheduled_at: string | null
          service_type: string
          status: string
          vehicle_id: string | null
          vendor: string | null
          walk_in_name: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          property_id: string
          scheduled_at?: string | null
          service_type: string
          status?: string
          vehicle_id?: string | null
          vendor?: string | null
          walk_in_name?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          property_id?: string
          scheduled_at?: string | null
          service_type?: string
          status?: string
          vehicle_id?: string | null
          vendor?: string | null
          walk_in_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "travel_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_vehicles: {
        Row: {
          id: string
          name: string
          property_id: string
          status: string
          vehicle_type: string
        }
        Insert: {
          id?: string
          name: string
          property_id: string
          status?: string
          vehicle_type: string
        }
        Update: {
          id?: string
          name?: string
          property_id?: string
          status?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_vehicles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          notes: string | null
          party_size: number
          property_id: string
          requested_check_in: string
          requested_check_out: string
          room_type_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          notes?: string | null
          party_size?: number
          property_id: string
          requested_check_in: string
          requested_check_out: string
          room_type_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          notes?: string | null
          party_size?: number
          property_id?: string
          requested_check_in?: string
          requested_check_out?: string
          room_type_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          created_at: string
          id: string
          issue: string
          location: string
          priority: string
          property_id: string
          status: string
          updated_at: string
          wo_number: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          issue: string
          location: string
          priority?: string
          property_id: string
          status?: string
          updated_at?: string
          wo_number?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          issue?: string
          location?: string
          priority?: string
          property_id?: string
          status?: string
          updated_at?: string
          wo_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "engineering_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      available_room_count: {
        Args: { p_date: string; p_room_type_id: string }
        Returns: number
      }
      available_room_counts_for_range: {
        Args: {
          p_end_date: string
          p_room_type_id: string
          p_start_date: string
        }
        Returns: {
          available_count: number
          stay_date: string
        }[]
      }
      banquet_venue_conflicts: {
        Args: {
          p_end_at: string
          p_exclude_event_id?: string
          p_start_at: string
          p_venue_id: string
        }
        Returns: {
          end_at: string
          event_name: string
          id: string
          start_at: string
        }[]
      }
      check_availability: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_exclude_reservation_id?: string
          p_room_type_id: string
        }
        Returns: boolean
      }
      compute_loyalty_tier: { Args: { p_points: number }; Returns: string }
      create_journal_entry: {
        Args: {
          p_description: string
          p_entry_date: string
          p_lines: Json
          p_property_id: string
          p_source_id?: string
          p_source_table?: string
          p_staff_id: string
        }
        Returns: string
      }
      generate_invoice_from_reservation: {
        Args: { p_reservation_id: string; p_staff_id: string }
        Returns: string
      }
      generate_master_invoice_from_booking: {
        Args: { p_booking_id: string; p_staff_id: string }
        Returns: string
      }
      get_busy_ranges_for_ical: {
        Args: { p_room_type_id: string; p_token: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      is_admin_staff: { Args: never; Returns: boolean }
      is_kitchen_network_staff: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_staff_for_property: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      is_staff_for_transfer: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      merge_guest_profiles: {
        Args: { p_source_guest_id: string; p_target_guest_id: string }
        Returns: undefined
      }
      move_reservation: {
        Args: {
          p_new_check_in: string
          p_new_check_out: string
          p_new_rate_per_night?: number
          p_new_room_id: string
          p_reservation_id: string
        }
        Returns: undefined
      }
      next_doc_number: {
        Args: { prefix: string; seq_name: string }
        Returns: string
      }
      post_invoice_to_ledger: {
        Args: { p_invoice_id: string; p_staff_id: string }
        Returns: string
      }
      post_payment_to_ledger: {
        Args: { p_payment_id: string; p_staff_id: string }
        Returns: string
      }
      receive_po_item: {
        Args: { p_po_item_id: string; p_quantity: number; p_staff_id: string }
        Returns: undefined
      }
      receive_stock_transfer: {
        Args: { p_staff_id: string; p_transfer_id: string }
        Returns: undefined
      }
      recompute_invoice_totals: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      resolve_signup: {
        Args: { p_email: string }
        Returns: {
          allowed: boolean
          property_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }[]
      }
      seed_default_chart_of_accounts: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      webhook_cancel_reservation: {
        Args: { p_connection_id: string; p_external_booking_id: string }
        Returns: undefined
      }
      webhook_create_reservation: {
        Args: {
          p_adults: number
          p_check_in: string
          p_check_out: string
          p_children: number
          p_connection_id: string
          p_external_booking_id: string
          p_guest_email: string
          p_guest_name: string
          p_guest_phone: string
          p_rate: number
          p_room_type_id: string
        }
        Returns: string
      }
      webhook_modify_reservation: {
        Args: {
          p_adults: number
          p_check_in: string
          p_check_out: string
          p_children: number
          p_connection_id: string
          p_external_booking_id: string
        }
        Returns: undefined
      }
      webhook_no_show_reservation: {
        Args: { p_connection_id: string; p_external_booking_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      booking_source:
        | "direct"
        | "phone"
        | "walk_in"
        | "ota"
        | "travel_agent"
        | "corporate"
        | "other"
      device_type: "printer" | "kds"
      invite_status: "pending" | "accepted" | "revoked"
      invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "cancelled"
        | "refunded"
      order_item_status:
        | "pending"
        | "preparing"
        | "ready"
        | "served"
        | "cancelled"
      order_status:
        | "open"
        | "sent_to_kitchen"
        | "preparing"
        | "ready"
        | "served"
        | "billed"
        | "cancelled"
      order_type: "dine_in" | "room_service" | "takeaway"
      payment_method: "cash" | "card" | "upi" | "bank_transfer" | "other"
      po_status:
        | "draft"
        | "ordered"
        | "partially_received"
        | "received"
        | "cancelled"
        | "pending_approval"
        | "approved"
        | "rejected"
      reservation_status:
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show"
      room_status:
        | "available"
        | "occupied"
        | "reserved"
        | "dirty"
        | "maintenance"
        | "out_of_order"
      staff_role:
        | "admin"
        | "front_office"
        | "restaurant_manager"
        | "waiter"
        | "chef"
        | "housekeeping"
        | "inventory_manager"
        | "accountant"
        | "engineering"
        | "hr"
        | "crm_marketing"
        | "banquet"
        | "spa_laundry"
        | "travel_desk"
      stock_movement_type:
        | "purchase_receipt"
        | "consumption"
        | "adjustment"
        | "wastage"
        | "transfer_out"
        | "transfer_in"
      table_status: "available" | "occupied" | "reserved" | "cleaning"
      transfer_status: "requested" | "in_transit" | "received" | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      booking_source: [
        "direct",
        "phone",
        "walk_in",
        "ota",
        "travel_agent",
        "corporate",
        "other",
      ],
      device_type: ["printer", "kds"],
      invite_status: ["pending", "accepted", "revoked"],
      invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "cancelled",
        "refunded",
      ],
      order_item_status: [
        "pending",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      order_status: [
        "open",
        "sent_to_kitchen",
        "preparing",
        "ready",
        "served",
        "billed",
        "cancelled",
      ],
      order_type: ["dine_in", "room_service", "takeaway"],
      payment_method: ["cash", "card", "upi", "bank_transfer", "other"],
      po_status: [
        "draft",
        "ordered",
        "partially_received",
        "received",
        "cancelled",
        "pending_approval",
        "approved",
        "rejected",
      ],
      reservation_status: [
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ],
      room_status: [
        "available",
        "occupied",
        "reserved",
        "dirty",
        "maintenance",
        "out_of_order",
      ],
      staff_role: [
        "admin",
        "front_office",
        "restaurant_manager",
        "waiter",
        "chef",
        "housekeeping",
        "inventory_manager",
        "accountant",
        "engineering",
        "hr",
        "crm_marketing",
        "banquet",
        "spa_laundry",
        "travel_desk",
      ],
      stock_movement_type: [
        "purchase_receipt",
        "consumption",
        "adjustment",
        "wastage",
        "transfer_out",
        "transfer_in",
      ],
      table_status: ["available", "occupied", "reserved", "cleaning"],
      transfer_status: ["requested", "in_transit", "received", "cancelled"],
    },
  },
} as const
