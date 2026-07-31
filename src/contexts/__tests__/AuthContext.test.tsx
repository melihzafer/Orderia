import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthWorkspace } from '../authTypes';
import {
  AuthGateway,
  GoogleSignInHandoff,
  RegisterDeviceInput,
} from '../../services/supabase/authGateway';
import {
  BranchRow,
  DeviceRow,
  MembershipRow,
  SignupRequestRow,
} from '../../services/supabase/database.types';

jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: {
    v4: () => '00000000-0000-4000-8000-000000000777',
  },
}));

const userId = '00000000-0000-4000-8000-000000000001';
const session = {
  user: {
    id: userId,
  },
} as Session;

describe('AuthProvider session restore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restores the previously selected manager branch and registers the device', async () => {
    const gateway = new FakeAuthGateway(
      session,
      createWorkspace([createMembership('membership-manager', null, 'manager')]),
    );
    await AsyncStorage.setItem(`orderia.cloud.active_branch.${userId}`, 'branch-2');
    const screen = await render(
      <AuthProvider gateway={gateway}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('active-branch').props.children).toBe('branch-2');
    expect(gateway.registeredDevices).toHaveLength(1);
    expect(gateway.registeredDevices[0]).toMatchObject({
      branchId: 'branch-2',
      organizationId: 'organization-1',
    });
  });

  it('requires an explicit branch choice when a manager has no saved selection', async () => {
    const gateway = new FakeAuthGateway(
      session,
      createWorkspace([createMembership('membership-manager', null, 'manager')]),
    );
    const screen = await render(
      <AuthProvider gateway={gateway}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('select_branch');
    });
    await fireEvent.press(screen.getByText('branch-1'));

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('active-branch').props.children).toBe('branch-1');
  });

  it('signs out a restored session when its device was revoked', async () => {
    const gateway = new FakeAuthGateway(
      session,
      createWorkspace([createMembership('membership-waiter', 'branch-1', 'waiter')]),
    );
    gateway.registrationError = new Error('device_revoked');
    const screen = await render(
      <AuthProvider gateway={gateway}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('signed_out');
    });
    expect(gateway.signOutCount).toBe(1);
    expect(screen.getByTestId('error').props.children).toMatch(/revoked/);
  });

  it('hands Google sign-in the callback address this build can be reached at', async () => {
    const gateway = new FakeAuthGateway(
      null,
      createWorkspace([createMembership('membership-waiter', 'branch-1', 'waiter')]),
    );
    const screen = await render(
      <AuthProvider gateway={gateway}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').props.children).toBe('signed_out');
    });
    await fireEvent.press(screen.getByText('google'));

    await waitFor(() => {
      expect(gateway.googleRedirects).toEqual(['orderia://auth-callback']);
    });
    expect(screen.getByTestId('error').props.children).toBe('');
  });
});

function AuthProbe() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="active-branch">{auth.activeBranch?.id ?? 'none'}</Text>
      <Text testID="error">{auth.errorMessage ?? ''}</Text>
      <Pressable
        onPress={() => {
          void auth.signInWithGoogle();
        }}
      >
        <Text>google</Text>
      </Pressable>
      {auth.workspace?.branches.map((branch) => (
        <Pressable
          key={branch.id}
          onPress={() => {
            void auth.switchBranch(branch.id);
          }}
        >
          <Text>{branch.id}</Text>
        </Pressable>
      ))}
    </View>
  );
}

class FakeAuthGateway implements AuthGateway {
  readonly registeredDevices: RegisterDeviceInput[] = [];
  registrationError?: Error;
  signOutCount = 0;
  readonly googleRedirects: string[] = [];
  pendingSignup: SignupRequestRow | null = null;

  constructor(
    private readonly session: Session | null,
    private readonly workspace: AuthWorkspace,
    signupRequest?: SignupRequestRow | null,
  ) {
    this.pendingSignup = signupRequest ?? null;
  }

  async getSession(): Promise<Session | null> {
    return this.session;
  }

  onAuthStateChange(
    _listener: (event: AuthChangeEvent, session: Session | null) => void,
  ): () => void {
    return () => undefined;
  }

  async signIn(_email: string, _password: string): Promise<Session> {
    if (!this.session) throw new Error('No fixture session');
    return this.session;
  }

  async startGoogleSignIn(redirectTo: string): Promise<GoogleSignInHandoff> {
    this.googleRedirects.push(redirectTo);
    return {
      authorizationUrl: `https://accounts.google.test/o?redirect=${redirectTo}`,
      redirected: false,
    };
  }

  async completeOAuthRedirect(_url: string): Promise<Session> {
    if (!this.session) throw new Error('No fixture session');
    return this.session;
  }

  async signOut(): Promise<void> {
    this.signOutCount += 1;
  }

  async loadWorkspace(_userId: string): Promise<AuthWorkspace> {
    return this.workspace;
  }

  async registerDevice(input: RegisterDeviceInput): Promise<DeviceRow> {
    if (this.registrationError) throw this.registrationError;
    this.registeredDevices.push(input);
    return createDevice(input);
  }

  async touchDevice(_deviceId: string): Promise<DeviceRow> {
    return createDevice(this.registeredDevices[0]);
  }

  async listDevices(_organizationId: string, _branchId?: string): Promise<readonly DeviceRow[]> {
    return [];
  }

  async revokeDevice(_deviceId: string): Promise<DeviceRow> {
    throw new Error('Not implemented in this fixture');
  }

  async signUp(_email: string, _password: string, displayName: string): Promise<Session> {
    if (!this.session) throw new Error('No fixture session');
    this.pendingSignup = {
      id: 'signup-1',
      user_id: '',
      email: _email,
      display_name: displayName,
      organization_id: null,
      status: 'pending',
      requested_at: new Date().toISOString(),
      decided_by: null,
      decided_at: null,
      notified_at: null,
    };
    return this.session;
  }

  async requestSignup(_displayName: string): Promise<SignupRequestRow> {
    if (!this.pendingSignup) throw new Error('No pending signup fixture');
    return this.pendingSignup;
  }

  async getMySignupRequest(): Promise<SignupRequestRow | null> {
    return this.pendingSignup;
  }

  async listPendingSignupRequests(): Promise<readonly SignupRequestRow[]> {
    return this.pendingSignup ? [this.pendingSignup] : [];
  }

  async approveSignupRequest(_signupId: string): Promise<void> {
    if (this.pendingSignup) {
      this.pendingSignup = { ...this.pendingSignup, status: 'approved' };
    }
  }

  async rejectSignupRequest(_signupId: string): Promise<void> {
    if (this.pendingSignup) {
      this.pendingSignup = { ...this.pendingSignup, status: 'rejected' };
    }
  }
}

function createWorkspace(memberships: readonly MembershipRow[]): AuthWorkspace {
  return {
    profile: {
      id: userId,
      display_name: 'Ayşe',
      email: 'ayse@example.com',
      avatar_url: null,
      locale: 'tr',
      created_at: '2026-07-26T13:00:00.000Z',
    },
    organizations: [
      {
        id: 'organization-1',
        name: 'Restaurant',
        slug: 'restaurant',
        plan: 'growth',
        status: 'active',
        created_at: '2026-07-26T13:00:00.000Z',
      },
    ],
    memberships,
    branches: [createBranch('branch-1'), createBranch('branch-2')],
  };
}

function createMembership(
  id: string,
  branchId: string | null,
  role: MembershipRow['role'],
): MembershipRow {
  return {
    id,
    organization_id: 'organization-1',
    branch_id: branchId,
    user_id: userId,
    role,
    status: 'active',
    created_at: '2026-07-26T13:00:00.000Z',
    deleted_at: null,
  };
}

function createBranch(id: string): BranchRow {
  return {
    id,
    organization_id: 'organization-1',
    name: id,
    timezone: 'Europe/Sofia',
    currency_code: 'EUR',
    business_day_cutoff: '04:00:00',
    receipt_prefix: 'ORD',
    status: 'active',
    allow_offline_payments: false,
    version: 1,
    created_at: '2026-07-26T13:00:00.000Z',
    updated_at: '2026-07-26T13:00:00.000Z',
    deleted_at: null,
  };
}

function createDevice(input: RegisterDeviceInput): DeviceRow {
  return {
    id: input.deviceId,
    organization_id: input.organizationId,
    branch_id: input.branchId,
    user_id: userId,
    platform: input.platform,
    app_version: input.appVersion,
    last_seen_at: '2026-07-26T13:00:00.000Z',
    last_sync_at: null,
    push_endpoint: null,
    revoked_at: null,
    created_at: '2026-07-26T13:00:00.000Z',
    updated_at: '2026-07-26T13:00:00.000Z',
  };
}
