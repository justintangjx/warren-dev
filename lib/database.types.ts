// Hand-written to match supabase/migrations/ (0001_init.sql + 0002_receipt_ocr.sql +
// 0003_product_registration.sql).
// Replace later with `supabase gen types typescript` output once the CLI is set up.

export type Database = {
  public: {
    Tables: {
      warranties: {
        Row: {
          id: string;
          user_id: string;
          brand: string;
          product_type: string;
          model_number: string;
          serial_number: string;
          purchase_date: string;
          warranty_duration_months: number;
          retailer: string | null;
          purchase_price_cents: number | null;
          receipt_url: string | null;
          is_extended: boolean;
          extended_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand: string;
          product_type: string;
          model_number: string;
          serial_number: string;
          purchase_date: string;
          warranty_duration_months?: number;
          retailer?: string | null;
          purchase_price_cents?: number | null;
          receipt_url?: string | null;
          is_extended?: boolean;
          extended_until?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['warranties']['Insert']>;
        Relationships: [];
      };
      claims: {
        Row: {
          id: string;
          warranty_id: string;
          user_id: string;
          issue_description: string;
          status: 'submitted' | 'in_review' | 'resolved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          warranty_id: string;
          user_id: string;
          issue_description: string;
          status?: 'submitted' | 'in_review' | 'resolved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['claims']['Insert']>;
        Relationships: [];
      };
      extended_warranty_purchases: {
        Row: {
          id: string;
          warranty_id: string;
          user_id: string;
          plan: '1y' | '2y';
          amount_cents: number;
          stripe_payment_intent_id: string | null;
          status: 'succeeded' | 'failed' | 'mocked';
          created_at: string;
        };
        Insert: {
          id?: string;
          warranty_id: string;
          user_id: string;
          plan: '1y' | '2y';
          amount_cents: number;
          stripe_payment_intent_id?: string | null;
          status?: 'succeeded' | 'failed' | 'mocked';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['extended_warranty_purchases']['Insert']>;
        Relationships: [];
      };
      product_registrations: {
        Row: {
          id: string;
          warranty_id: string;
          user_id: string;
          status: 'not_started' | 'assisted' | 'registered' | 'not_available';
          method: 'url' | 'unsupported' | null;
          registration_url: string | null;
          confirmation_reference: string | null;
          registered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          warranty_id: string;
          user_id: string;
          status?: 'not_started' | 'assisted' | 'registered' | 'not_available';
          method?: 'url' | 'unsupported' | null;
          registration_url?: string | null;
          confirmation_reference?: string | null;
          registered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_registrations']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
