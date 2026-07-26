type OrganizationPlan = 'trial' | 'starter' | 'growth' | 'enterprise';
type OrganizationStatus = 'active' | 'suspended' | 'closed';
type MembershipRole = 'waiter' | 'manager';
type MembershipStatus = 'invited' | 'active' | 'suspended';
type DevicePlatform = 'android' | 'ios_web' | 'web';

export type Json = boolean | number | string | null | Json[] | { [key: string]: Json | undefined };

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  created_at: string;
};

export type BranchRow = {
  id: string;
  organization_id: string;
  name: string;
  timezone: string;
  currency_code: string;
  business_day_cutoff: string;
  receipt_prefix: string;
  status: OrganizationStatus;
  allow_offline_payments: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  locale: string;
  created_at: string;
};

export type MembershipRow = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  deleted_at: string | null;
};

export type DeviceRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  user_id: string;
  platform: DevicePlatform;
  app_version: string;
  last_seen_at: string;
  last_sync_at: string | null;
  push_endpoint: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncEventRow = {
  sequence: number;
  organization_id: string;
  branch_id: string;
  repository: string;
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload_json: Json;
  server_version: number | null;
  client_mutation_id: string | null;
  committed_at: string;
};

export type PulledSyncEventRow = Omit<SyncEventRow, 'sequence'> & {
  cursor: string;
};

export type ActiveSessionParticipantRow = {
  user_id: string;
  display_name: string;
  first_action_at: string;
  last_action_at: string;
};

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: TableDefinition<OrganizationRow>;
      branches: TableDefinition<BranchRow>;
      profiles: TableDefinition<ProfileRow>;
      memberships: TableDefinition<MembershipRow>;
      devices: TableDefinition<DeviceRow>;
      sync_events: TableDefinition<SyncEventRow>;
    };
    Views: Record<never, never>;
    Functions: {
      register_device: {
        Args: {
          device_id: string;
          requested_organization_id: string;
          requested_branch_id: string;
          device_platform: DevicePlatform;
          client_app_version: string;
          device_push_endpoint?: string;
        };
        Returns: DeviceRow;
      };
      touch_device: {
        Args: {
          device_id: string;
          synced_at?: string;
        };
        Returns: DeviceRow;
      };
      revoke_device: {
        Args: {
          device_id: string;
        };
        Returns: DeviceRow;
      };
      apply_client_mutation: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_device_id: string;
          requested_client_mutation_id: string;
          requested_mutation_type: string;
          requested_entity_id: string;
          requested_payload: Json;
          requested_base_version: number | null;
        };
        Returns: Json;
      };
      apply_concurrent_order_batch: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_device_id: string;
          requested_client_mutation_id: string;
          requested_entity_id: string;
          requested_payload: Json;
        };
        Returns: Json;
      };
      apply_order_item_note_command: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_device_id: string;
          requested_client_mutation_id: string;
          requested_entity_id: string;
          requested_payload: Json;
          requested_base_version: number | null;
        };
        Returns: Json;
      };
      confirm_check_payments: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_device_id: string;
          requested_client_mutation_id: string;
          requested_payload: Json;
        };
        Returns: Json;
      };
      list_active_session_participants: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_table_session_id: string;
          active_since?: string;
        };
        Returns: ActiveSessionParticipantRow[];
      };
      transfer_or_merge_table_session: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          requested_device_id: string;
          requested_client_mutation_id: string;
          requested_payload: Json;
        };
        Returns: Json;
      };
      pull_sync_events: {
        Args: {
          requested_organization_id: string;
          requested_branch_id: string;
          after_sequence: string;
          page_size?: number;
        };
        Returns: PulledSyncEventRow[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
