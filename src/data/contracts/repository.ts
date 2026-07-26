import {
  AuditEvent,
  Branch,
  Check,
  Device,
  Hall,
  Membership,
  OrderBatch,
  OrderItem,
  OrderItemModifier,
  Organization,
  Payment,
  PaymentAllocation,
  Receipt,
  RestaurantTable,
  TableSession,
} from '../../domain';
import { BranchId, OrganizationId } from '../../domain/ids';

export interface DomainEntityMap {
  readonly organizations: Organization;
  readonly branches: Branch;
  readonly memberships: Membership;
  readonly devices: Device;
  readonly halls: Hall;
  readonly restaurantTables: RestaurantTable;
  readonly tableSessions: TableSession;
  readonly checks: Check;
  readonly orderBatches: OrderBatch;
  readonly orderItems: OrderItem;
  readonly orderItemModifiers: OrderItemModifier;
  readonly payments: Payment;
  readonly paymentAllocations: PaymentAllocation;
  readonly receipts: Receipt;
  readonly auditEvents: AuditEvent;
}

export type RepositoryName = keyof DomainEntityMap;

export interface RepositoryScope {
  readonly organizationId: OrganizationId;
  readonly branchId?: BranchId;
}

export interface RepositoryQuery {
  readonly after?: string;
  readonly includeDeleted?: boolean;
  readonly limit?: number;
}

export interface RepositoryPage<Entity> {
  readonly items: readonly Entity[];
  readonly nextCursor?: string;
}

export interface PutOptions {
  readonly expectedVersion?: number | null;
}

export interface TombstoneOptions extends PutOptions {
  readonly deletedAt: string;
}

export interface ReadRepository<Entity extends { readonly id: string }> {
  getById(scope: RepositoryScope, id: Entity['id']): Promise<Entity | null>;
  list(scope: RepositoryScope, query?: RepositoryQuery): Promise<RepositoryPage<Entity>>;
}

export interface TransactionRepository<
  Entity extends { readonly id: string },
> extends ReadRepository<Entity> {
  put(scope: RepositoryScope, entity: Entity, options?: PutOptions): Promise<Entity>;
  tombstone(scope: RepositoryScope, id: Entity['id'], options: TombstoneOptions): Promise<Entity>;
}

export class OptimisticConcurrencyError extends Error {
  constructor(
    readonly repository: RepositoryName,
    readonly entityId: string,
    readonly expectedVersion: number | null,
    readonly actualVersion: number | null,
  ) {
    super(
      `Optimistic concurrency failure in ${repository}/${entityId}: expected ${expectedVersion}, got ${actualVersion}`,
    );
    this.name = 'OptimisticConcurrencyError';
  }
}
