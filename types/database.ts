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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type: string
          start_date: string
          end_date: string
          is_half_day: boolean
          reason: string
          status: string
          medical_certificate_url: string | null
          is_paid: boolean
          certificate_verified_by: string | null
          first_level_approver_id: string | null
          hr_approver_id: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: string
          start_date: string
          end_date: string
          is_half_day?: boolean
          reason: string
          status?: string
          medical_certificate_url?: string | null
          is_paid?: boolean
          certificate_verified_by?: string | null
          first_level_approver_id?: string | null
          hr_approver_id?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          is_half_day?: boolean
          reason?: string
          status?: string
          medical_certificate_url?: string | null
          is_paid?: boolean
          certificate_verified_by?: string | null
          first_level_approver_id?: string | null
          hr_approver_id?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comp_off_ledger: {
        Row: {
          id: string
          employee_id: string
          transaction_type: string
          hours: number
          reference_id: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          transaction_type: string
          hours: number
          reference_id: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          transaction_type?: string
          hours?: number
          reference_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comp_off_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_logs: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          details: Json | null
          id: string
          severity: string | null
          target_user_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          eod_reference_id: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          eod_reference_id?: string | null
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          eod_reference_id?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_eod_reference_id_fkey"
            columns: ["eod_reference_id"]
            isOneToOne: false
            referencedRelation: "eod_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          email: string | null
          phone: string | null
          gst_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          email?: string | null
          phone?: string | null
          gst_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          email?: string | null
          phone?: string | null
          gst_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      eod_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blockers: string | null
          created_at: string
          employee_id: string
          id: string
          job_card_numbers: string | null
          location: string
          office_hours: number
          photo_url: string | null
          rejection_reason: string | null
          report_date: string
          status: string
          submitted_by: string
          tasks_accomplished: string
          tomorrows_plan: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blockers?: string | null
          created_at?: string
          employee_id: string
          id?: string
          job_card_numbers?: string | null
          location: string
          office_hours: number
          photo_url?: string | null
          rejection_reason?: string | null
          report_date: string
          status?: string
          submitted_by: string
          tasks_accomplished: string
          tomorrows_plan?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blockers?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          job_card_numbers?: string | null
          location?: string
          office_hours?: number
          photo_url?: string | null
          rejection_reason?: string | null
          report_date?: string
          status?: string
          submitted_by?: string
          tasks_accomplished?: string
          tomorrows_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eod_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eod_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          date: string
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          designation: string | null
          dob: string | null
          documents: Json | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          emergency_contact_relation: string | null
          employee_id: string | null
          employment_type: string | null
          experience: number | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          joining_date: string | null
          last_name: string
          personal_email: string | null
          phone_number: string | null
          profile_photo: string | null
          reporting_manager_id: string | null
          residential_address: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          salary: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience?: number | null
          first_name: string
          gender?: string | null
          id: string
          is_active?: boolean | null
          joining_date?: string | null
          last_name: string
          personal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          reporting_manager_id?: string | null
          residential_address?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          documents?: Json | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          emergency_contact_relation?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience?: number | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          last_name?: string
          personal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          reporting_manager_id?: string | null
          residential_address?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          salary?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_hikes: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
          id: string
          new_salary: number
          previous_salary: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          employee_id: string
          id?: string
          new_salary: number
          previous_salary: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          new_salary?: number
          previous_salary?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_hikes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          id: string
          branch_id: string | null
          month: number
          year: number
          status: string
          locked_by: string | null
          locked_at: string | null
          slip_status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          branch_id?: string | null
          month: number
          year: number
          status?: string
          locked_by?: string | null
          locked_at?: string | null
          slip_status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          branch_id?: string | null
          month?: number
          year?: number
          status?: string
          locked_by?: string | null
          locked_at?: string | null
          slip_status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_cycles_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll_snapshots: {
        Row: {
          id: string
          cycle_id: string
          employee_id: string
          employee_name: string | null
          employee_id_external: string | null
          department: string | null
          designation: string | null
          base_salary: number | null
          days_present: number | null
          days_field: number | null
          days_paid_leave: number | null
          days_unpaid_leave: number | null
          days_absent: number | null
          net_payable: number | null
          basic_salary: number | null
          hra: number | null
          allowance: number | null
          bonus: number | null
          gross_salary: number | null
          pf: number | null
          esi: number | null
          professional_tax: number | null
          income_tax: number | null
          other_deductions: number | null
          damage_recovery: number | null
          salary_advance_recovery: number | null
          total_deductions: number | null
          net_salary: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          medical_allowance: number | null
          travel_expense: number | null
          performance_incentive: number | null
          food_allowance: number | null
          tds: number | null
          is_reviewed: boolean | null
          remarks: string | null
          calculated_at: string | null
        }
        Insert: {
          id?: string
          cycle_id: string
          employee_id: string
          employee_name?: string | null
          employee_id_external?: string | null
          department?: string | null
          designation?: string | null
          base_salary?: number | null
          days_present?: number | null
          days_field?: number | null
          days_paid_leave?: number | null
          days_unpaid_leave?: number | null
          days_absent?: number | null
          net_payable?: number | null
          basic_salary?: number | null
          hra?: number | null
          allowance?: number | null
          bonus?: number | null
          gross_salary?: number | null
          pf?: number | null
          esi?: number | null
          professional_tax?: number | null
          income_tax?: number | null
          other_deductions?: number | null
          damage_recovery?: number | null
          salary_advance_recovery?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          medical_allowance?: number | null
          travel_expense?: number | null
          performance_incentive?: number | null
          food_allowance?: number | null
          tds?: number | null
          is_reviewed?: boolean | null
          remarks?: string | null
          calculated_at?: string | null
        }
        Update: {
          id?: string
          cycle_id?: string
          employee_id?: string
          employee_name?: string | null
          employee_id_external?: string | null
          department?: string | null
          designation?: string | null
          base_salary?: number | null
          days_present?: number | null
          days_field?: number | null
          days_paid_leave?: number | null
          days_unpaid_leave?: number | null
          days_absent?: number | null
          net_payable?: number | null
          basic_salary?: number | null
          hra?: number | null
          allowance?: number | null
          bonus?: number | null
          gross_salary?: number | null
          pf?: number | null
          esi?: number | null
          professional_tax?: number | null
          income_tax?: number | null
          other_deductions?: number | null
          damage_recovery?: number | null
          salary_advance_recovery?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          medical_allowance?: number | null
          travel_expense?: number | null
          performance_incentive?: number | null
          food_allowance?: number | null
          tds?: number | null
          is_reviewed?: boolean | null
          remarks?: string | null
          calculated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_snapshots_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_snapshots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      salary_slips: {
        Row: {
          id: string
          employee_id: string
          cycle_id: string
          snapshot_id: string
          pdf_url: string | null
          generated_at: string | null
          generated_by: string | null
          emailed: boolean | null
          emailed_at: string | null
          emailed_by: string | null
          shared: boolean | null
          status: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          cycle_id: string
          snapshot_id: string
          pdf_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          emailed_by?: string | null
          shared?: boolean | null
          status?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          cycle_id?: string
          snapshot_id?: string
          pdf_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          emailed_by?: string | null
          shared?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_slips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_slips_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "payroll_snapshots"
            referencedColumns: ["id"]
          }
        ]
      }
      employee_financial_ledger: {
        Row: {
          id: string
          employee_id: string
          adjustment_type: string
          adjustment_category: string
          original_amount: number
          remaining_amount: number
          suggested_installment_amount: number | null
          effective_date: string
          description: string | null
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
          kilometers: number | null
          vehicle_type: string | null
          tds_applied: boolean | null
          tds_rate: number | null
        }
        Insert: {
          id?: string
          employee_id: string
          adjustment_type: string
          adjustment_category: string
          original_amount?: number
          remaining_amount?: number
          suggested_installment_amount?: number | null
          effective_date?: string
          description?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          kilometers?: number | null
          vehicle_type?: string | null
          tds_applied?: boolean | null
          tds_rate?: number | null
        }
        Update: {
          id?: string
          employee_id?: string
          adjustment_type?: string
          adjustment_category?: string
          original_amount?: number
          remaining_amount?: number
          suggested_installment_amount?: number | null
          effective_date?: string
          description?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          kilometers?: number | null
          vehicle_type?: string | null
          tds_applied?: boolean | null
          tds_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_financial_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll_adjustment_applications: {
        Row: {
          id: string
          employee_id: string
          ledger_id: string | null
          cycle_id: string
          adjustment_type: string
          adjustment_category: string
          applied_amount: number
          status: string
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          ledger_id?: string | null
          cycle_id: string
          adjustment_type: string
          adjustment_category: string
          applied_amount?: number
          status?: string
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          ledger_id?: string | null
          cycle_id?: string
          adjustment_type?: string
          adjustment_category?: string
          applied_amount?: number
          status?: string
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustment_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustment_applications_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "employee_financial_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustment_applications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          }
        ]
      }
      test_master: {
        Row: {
          id: string
          serial_no: string
          discipline_group: string
          material_product: string
          component_parameter: string
          specific_test: string
          test_method: string
          technique_equipment: string
          is_nabl: boolean
          category: string
          additional_details: string[] | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          serial_no: string
          discipline_group: string
          material_product: string
          component_parameter: string
          specific_test: string
          test_method: string
          technique_equipment: string
          is_nabl?: boolean
          category: string
          additional_details?: string[] | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          serial_no?: string
          discipline_group?: string
          material_product?: string
          component_parameter?: string
          specific_test?: string
          test_method?: string
          technique_equipment?: string
          is_nabl?: boolean
          category?: string
          additional_details?: string[] | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      lock_payroll_cycle: {
        Args: {
          p_month: number
          p_year: number
          p_locked_by: string
          p_snapshots: Json[]
        }
        Returns: void
      }
      get_today_birthdays: {
        Args: never
        Returns: {
          first_name: string
          id: string
          last_name: string
        }[]
      }
      submit_eod_rpc: {
        Args: {
          p_blockers: string
          p_employee_id: string
          p_job_card_numbers?: string
          p_location: string
          p_office_hours: number
          p_photo_url: string
          p_report_date: string
          p_status: string
          p_submitted_by: string
          p_tasks_accomplished: string
          p_tomorrows_plan?: string
        }
        Returns: string
      }
      update_eod_rpc: {
        Args: {
          p_blockers: string
          p_employee_id: string
          p_job_card_numbers?: string
          p_location: string
          p_office_hours: number
          p_photo_url: string
          p_report_date: string
          p_status: string
          p_submitted_by: string
          p_tasks_accomplished: string
          p_tomorrows_plan?: string
        }
        Returns: string
      }
      review_eod_rpc: {
        Args: {
          p_eod_id: string
          p_status: string
          p_rejection_reason: string | null
        }
        Returns: string
      }
      generate_employee_id: {
        Args: {
          p_branch_id?: string | null
          p_is_preview?: boolean
        }
        Returns: string
      }
      delete_branch_transaction: {
        Args: {
          p_branch_id: string
          p_admin_id: string
        }
        Returns: {
          success: boolean
          error?: string
          deleted_users_count?: number
        }
      }
    }
    Enums: {
      user_role:
        | "SUPER_ADMIN"
        | "BRANCH_MANAGER_ADMINISTRATIVE"
        | "HR"
        | "QUALITY_MANAGER"
        | "TECHNICAL_MANAGER"
        | "ADMIN_INWARD_CRE"
        | "ACCOUNTANT"
        | "TEST_ENGINEER"
        | "LAB_ANALYST"
        | "LAB_ASSISTANT"
        | "SAMPLER"
        | "MARKETING_EXECUTIVE"
        | "DIGITAL_MARKETING"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: [
        "SUPER_ADMIN",
        "BRANCH_MANAGER_ADMINISTRATIVE",
        "HR",
        "QUALITY_MANAGER",
        "TECHNICAL_MANAGER",
        "ADMIN_INWARD_CRE",
        "ACCOUNTANT",
        "TEST_ENGINEER",
        "LAB_ANALYST",
        "LAB_ASSISTANT",
        "SAMPLER",
        "MARKETING_EXECUTIVE",
        "DIGITAL_MARKETING",
      ],
    },
  },
} as const
