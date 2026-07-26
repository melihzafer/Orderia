import { AuthWorkspace, accessibleBranches, membershipForBranch } from '../authTypes';
import {
  BranchRow,
  MembershipRow,
  OrganizationRow,
  ProfileRow,
} from '../../services/supabase/database.types';

const profile: ProfileRow = {
  id: 'user-1',
  display_name: 'Ayşe',
  email: 'ayse@example.com',
  avatar_url: null,
  locale: 'tr',
  created_at: '2026-07-26T13:00:00.000Z',
};

const organizations: readonly OrganizationRow[] = [
  {
    id: 'organization-a',
    name: 'Restaurant A',
    slug: 'restaurant-a',
    plan: 'growth',
    status: 'active',
    created_at: '2026-07-26T13:00:00.000Z',
  },
  {
    id: 'organization-b',
    name: 'Restaurant B',
    slug: 'restaurant-b',
    plan: 'starter',
    status: 'active',
    created_at: '2026-07-26T13:00:00.000Z',
  },
];

const branches: readonly BranchRow[] = [
  createBranch('branch-a-1', 'organization-a'),
  createBranch('branch-a-2', 'organization-a'),
  createBranch('branch-b-1', 'organization-b'),
];

describe('auth workspace branch authorization', () => {
  it('limits a waiter to explicitly assigned branches', () => {
    const workspace = createWorkspace([
      createMembership('waiter-a', 'organization-a', 'branch-a-1', 'waiter'),
    ]);

    expect(accessibleBranches(workspace).map((branch) => branch.id)).toEqual(['branch-a-1']);
  });

  it('allows an organization manager to switch across that organization only', () => {
    const workspace = createWorkspace([
      createMembership('manager-a', 'organization-a', null, 'manager'),
    ]);

    expect(accessibleBranches(workspace).map((branch) => branch.id)).toEqual([
      'branch-a-1',
      'branch-a-2',
    ]);
  });

  it('keeps a branch-scoped manager inside the assigned branch', () => {
    const membership = createMembership('manager-a-1', 'organization-a', 'branch-a-1', 'manager');
    const workspace = createWorkspace([membership]);

    expect(accessibleBranches(workspace).map((branch) => branch.id)).toEqual(['branch-a-1']);
    expect(membershipForBranch(workspace, branches[0])).toEqual(membership);
    expect(membershipForBranch(workspace, branches[1])).toBeNull();
  });
});

function createWorkspace(memberships: readonly MembershipRow[]): AuthWorkspace {
  return {
    profile,
    memberships,
    organizations,
    branches,
  };
}

function createBranch(id: string, organizationId: string): BranchRow {
  return {
    id,
    organization_id: organizationId,
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

function createMembership(
  id: string,
  organizationId: string,
  branchId: string | null,
  role: MembershipRow['role'],
): MembershipRow {
  return {
    id,
    organization_id: organizationId,
    branch_id: branchId,
    user_id: profile.id,
    role,
    status: 'active',
    created_at: '2026-07-26T13:00:00.000Z',
    deleted_at: null,
  };
}
