type OrganizationPlan = 'trial' | 'starter' | 'growth' | 'enterprise';
type OrganizationStatus = 'active' | 'suspended' | 'closed';
type MembershipRole = 'waiter' | 'manager';
type MembershipStatus = 'invited' | 'active' | 'suspended';
type DevicePlatform = 'android' | 'ios_web' | 'web';

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
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
