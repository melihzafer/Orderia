import { Session } from '@supabase/supabase-js';
import {
  BranchRow,
  DeviceRow,
  MembershipRow,
  OrganizationRow,
  ProfileRow,
  SignupRequestRow,
} from '../services/supabase/database.types';

export interface AuthWorkspace {
  readonly profile: ProfileRow;
  readonly memberships: readonly MembershipRow[];
  readonly organizations: readonly OrganizationRow[];
  readonly branches: readonly BranchRow[];
}

export type AuthStatus =
  | 'unconfigured'
  | 'initializing'
  | 'signed_out'
  | 'pending_approval'
  | 'select_branch'
  | 'ready'
  | 'error';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly cloudEnabled: boolean;
  readonly session: Session | null;
  readonly workspace: AuthWorkspace | null;
  readonly activeBranch: BranchRow | null;
  readonly activeOrganization: OrganizationRow | null;
  readonly activeMembership: MembershipRow | null;
  readonly currentDeviceId: string | null;
  readonly devices: readonly DeviceRow[];
  readonly errorMessage?: string;
  readonly pendingSignupEmail?: string;
  readonly pendingApprovals: readonly SignupRequestRow[];
  readonly googleSignInAvailable: boolean;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  refreshApprovals(): Promise<void>;
  approveSignup(signupId: string): Promise<void>;
  rejectSignup(signupId: string): Promise<void>;
  retry(): Promise<void>;
  switchBranch(branchId: string): Promise<void>;
  refreshDevices(): Promise<void>;
  revokeDevice(deviceId: string): Promise<void>;
}

export function accessibleBranches(workspace: AuthWorkspace): readonly BranchRow[] {
  return workspace.branches.filter((branch) =>
    workspace.memberships.some(
      (membership) =>
        membership.organization_id === branch.organization_id &&
        membership.status === 'active' &&
        membership.deleted_at === null &&
        (membership.branch_id === branch.id ||
          (membership.role === 'manager' && membership.branch_id === null)),
    ),
  );
}

export function membershipForBranch(
  workspace: AuthWorkspace,
  branch: BranchRow,
): MembershipRow | null {
  return (
    workspace.memberships.find(
      (membership) =>
        membership.organization_id === branch.organization_id &&
        membership.branch_id === branch.id &&
        membership.status === 'active' &&
        membership.deleted_at === null,
    ) ??
    workspace.memberships.find(
      (membership) =>
        membership.organization_id === branch.organization_id &&
        membership.role === 'manager' &&
        membership.branch_id === null &&
        membership.status === 'active' &&
        membership.deleted_at === null,
    ) ??
    null
  );
}
