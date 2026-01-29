export type Database = {
  public: {
    Tables: {
      banks: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
          icon?: string
          color?: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
          icon?: string
          color?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
          icon?: string
          color?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          bank_id: string | null
          type: 'checking' | 'savings' | 'wallet' | 'investment_fund' | 'investment' | 'cryptocurrency' | 'other'
          name: string
          initial_balance: number
          current_balance: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_id?: string | null
          type?: 'checking' | 'savings' | 'wallet' | 'investment_fund' | 'investment' | 'cryptocurrency' | 'other'
          name: string
          initial_balance?: number
          current_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_id?: string | null
          type?: 'checking' | 'savings' | 'wallet' | 'investment_fund' | 'investment' | 'cryptocurrency' | 'other'
          name?: string
          initial_balance?: number
          current_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          type: 'income' | 'expense' | 'transfer'
          amount: number
          description: string | null
          transaction_date: string
          created_at: string
          updated_at: string
          related_account_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          type: 'income' | 'expense' | 'transfer'
          amount: number
          description?: string | null
          transaction_date: string
          created_at?: string
          updated_at?: string
          related_account_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          type?: 'income' | 'expense' | 'transfer'
          amount?: number
          description?: string | null
          transaction_date?: string
          created_at?: string
          updated_at?: string
          related_account_id?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          period: 'monthly' | 'yearly'
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          period?: 'monthly' | 'yearly'
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          period?: 'monthly' | 'yearly'
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          currency: string
          billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'bi-weekly'
          next_payment_date: string
          category_id: string | null
          logo_url: string | null
          status: 'active' | 'paused' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          currency?: string
          billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'bi-weekly'
          next_payment_date: string
          category_id?: string | null
          logo_url?: string | null
          status: 'active' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          currency?: string
          billing_cycle?: 'monthly' | 'yearly' | 'weekly' | 'bi-weekly'
          next_payment_date?: string
          category_id?: string | null
          logo_url?: string | null
          status?: 'active' | 'paused' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}