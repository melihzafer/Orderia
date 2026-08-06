import { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { Database, DeviceRow, Json, SignupRequestRow } from './database.types';
import type { AuthWorkspace, OnboardingRole } from '../../contexts/authTypes';

export interface RegisterDeviceInput {
  readonly appVersion: string;
  readonly branchId: string;
  readonly deviceId: string;
  readonly organizationId: string;
  readonly platform: DeviceRow['platform'];
  readonly pushEndpoint?: string;
}

export interface RestaurantOnboardingResult {
  readonly organizationId: string;
  readonly branchId: string;
  readonly restaurantCode: string;
  readonly restaurantName: string;
  readonly role: OnboardingRole;
}

export interface AuthGateway {
  getSession(): Promise<Session | null>;
  onAuthStateChange(
    listener: (event: AuthChangeEvent, session: Session | null) => void,
  ): () => void;
  signIn(email: string, password: string): Promise<Session>;
  signUp(email: string, password: string, displayName: string): Promise<Session>;
  joinRestaurant(code: string, role: OnboardingRole): Promise<RestaurantOnboardingResult>;
  createRestaurant(name: string, branchName?: string): Promise<RestaurantOnboardingResult>;
  requestSignup(displayName: string): Promise<SignupRequestRow>;
  getMySignupRequest(): Promise<SignupRequestRow | null>;
  listPendingSignupRequests(): Promise<readonly SignupRequestRow[]>;
  approveSignupRequest(signupId: string, role?: 'waiter' | 'manager'): Promise<void>;
  rejectSignupRequest(signupId: string): Promise<void>;
  signOut(): Promise<void>;
  loadWorkspace(userId: string): Promise<AuthWorkspace>;
  registerDevice(input: RegisterDeviceInput): Promise<DeviceRow>;
  touchDevice(deviceId: string): Promise<DeviceRow>;
  listDevices(organizationId: string, branchId?: string): Promise<readonly DeviceRow[]>;
  revokeDevice(deviceId: string): Promise<DeviceRow>;
}

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  onAuthStateChange(
    listener: (event: AuthChangeEvent, session: Session | null) => void,
  ): () => void {
    const { data } = this.client.auth.onAuthStateChange(listener);
    return () => {
      data.subscription.unsubscribe();
    };
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error('Supabase did not return an authenticated session');
    }
    return data.session;
  }

  async signUp(email: string, password: string, displayName: string): Promise<Session> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) throw error;
    if (!data.session) {
      // Proje "Confirm email" açık bırakılmış: garsona değil sahibe e-posta
      // gitmesi için bu ayar kapalı olmalı (bkz. docs/CLOUD_SYNC_SETUP.md).
      throw new Error('email_confirmation_must_be_disabled');
    }
    return data.session;
  }

  async joinRestaurant(code: string, role: OnboardingRole): Promise<RestaurantOnboardingResult> {
    const { data, error } = await this.client.rpc('join_restaurant', {
      requested_code: normalizeRestaurantCode(code),
      requested_role: role,
    });
    if (error) throw error;
    return parseRestaurantOnboardingResult(data);
  }

  async createRestaurant(name: string, branchName?: string): Promise<RestaurantOnboardingResult> {
    const { data, error } = await this.client.rpc('create_restaurant', {
      requested_name: name.trim(),
      requested_branch_name: branchName?.trim() || null,
    });
    if (error) throw error;
    return parseRestaurantOnboardingResult(data);
  }

  async requestSignup(displayName: string): Promise<SignupRequestRow> {
    const { data, error } = await this.client.rpc('request_signup', {
      requested_display_name: displayName,
    });
    if (error) throw error;
    // Sahibe onay e-postası gönder (best-effort; hata kaydı engellemez)
    try {
      await this.client.functions.invoke('signup-approval', { body: {} });
    } catch {
      // Edge function henüz deploy edilmemiş olabilir; yönetici uygulama
      // içinden de onaylayabilir.
    }
    return data;
  }

  async getMySignupRequest(): Promise<SignupRequestRow | null> {
    const { data, error } = await this.client.rpc('my_signup_request');
    if (error) throw error;
    return data;
  }

  async listPendingSignupRequests(): Promise<readonly SignupRequestRow[]> {
    const { data, error } = await this.client.rpc('list_pending_signup_requests');
    if (error) throw error;
    return data;
  }

  async approveSignupRequest(signupId: string, role: 'waiter' | 'manager' = 'waiter') {
    const { error } = await this.client.rpc('approve_signup_request', {
      requested_signup_id: signupId,
      requested_role: role,
    });
    if (error) throw error;
  }

  async rejectSignupRequest(signupId: string): Promise<void> {
    const { error } = await this.client.rpc('reject_signup_request', {
      requested_signup_id: signupId,
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  async loadWorkspace(userId: string): Promise<AuthWorkspace> {
    const [profileResult, membershipsResult] = await Promise.all([
      this.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
      this.client
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('deleted_at', null),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (!profileResult.data) {
      throw new Error('Authenticated user profile is missing');
    }

    const memberships = membershipsResult.data;
    const organizationIds = Array.from(
      new Set(memberships.map((membership) => membership.organization_id)),
    );
    if (organizationIds.length === 0) {
      return {
        profile: profileResult.data,
        memberships,
        organizations: [],
        branches: [],
      };
    }

    const [organizationsResult, branchesResult] = await Promise.all([
      this.client
        .from('organizations')
        .select('*')
        .in('id', organizationIds)
        .eq('status', 'active'),
      this.client
        .from('branches')
        .select('*')
        .in('organization_id', organizationIds)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name'),
    ]);
    if (organizationsResult.error) throw organizationsResult.error;
    if (branchesResult.error) throw branchesResult.error;

    return {
      profile: profileResult.data,
      memberships,
      organizations: organizationsResult.data,
      branches: branchesResult.data,
    };
  }

  async registerDevice(input: RegisterDeviceInput): Promise<DeviceRow> {
    const { data, error } = await this.client.rpc('register_device', {
      device_id: input.deviceId,
      requested_organization_id: input.organizationId,
      requested_branch_id: input.branchId,
      device_platform: input.platform,
      client_app_version: input.appVersion,
      ...(input.pushEndpoint === undefined ? {} : { device_push_endpoint: input.pushEndpoint }),
    });
    if (error) throw error;
    return data;
  }

  async touchDevice(deviceId: string): Promise<DeviceRow> {
    const { data, error } = await this.client.rpc('touch_device', {
      device_id: deviceId,
    });
    if (error) throw error;
    return data;
  }

  async listDevices(organizationId: string, branchId?: string): Promise<readonly DeviceRow[]> {
    let query = this.client
      .from('devices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_seen_at', { ascending: false });
    if (branchId !== undefined) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async revokeDevice(deviceId: string): Promise<DeviceRow> {
    const { data, error } = await this.client.rpc('revoke_device', {
      device_id: deviceId,
    });
    if (error) throw error;
    return data;
  }
}

function normalizeRestaurantCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function parseRestaurantOnboardingResult(value: Json): RestaurantOnboardingResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_onboarding_response');
  }

  const record = value as Record<string, Json | undefined>;
  const organizationId = record.organizationId;
  const branchId = record.branchId;
  const restaurantCode = record.restaurantCode;
  const restaurantName = record.restaurantName;
  const role = record.role;
  if (
    typeof organizationId !== 'string' ||
    typeof branchId !== 'string' ||
    typeof restaurantCode !== 'string' ||
    typeof restaurantName !== 'string' ||
    (role !== 'waiter' && role !== 'manager')
  ) {
    throw new Error('invalid_onboarding_response');
  }

  return {
    organizationId,
    branchId,
    restaurantCode,
    restaurantName,
    role,
  };
}
