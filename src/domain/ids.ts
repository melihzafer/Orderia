declare const domainIdBrand: unique symbol;

export type DomainId<Name extends string> = string & {
  readonly [domainIdBrand]: Name;
};

export type OrganizationId = DomainId<'Organization'>;
export type BranchId = DomainId<'Branch'>;
export type UserId = DomainId<'User'>;
export type MembershipId = DomainId<'Membership'>;
export type DeviceId = DomainId<'Device'>;
export type HallId = DomainId<'Hall'>;
export type RestaurantTableId = DomainId<'RestaurantTable'>;
export type TableSessionId = DomainId<'TableSession'>;
export type CheckId = DomainId<'Check'>;
export type OrderBatchId = DomainId<'OrderBatch'>;
export type OrderItemId = DomainId<'OrderItem'>;
export type OrderItemModifierId = DomainId<'OrderItemModifier'>;
export type MenuItemId = DomainId<'MenuItem'>;
export type MenuCategoryId = DomainId<'MenuCategory'>;
export type CancellationReasonId = DomainId<'CancellationReason'>;
export type PaymentId = DomainId<'Payment'>;
export type PaymentAllocationId = DomainId<'PaymentAllocation'>;
export type ReceiptId = DomainId<'Receipt'>;
export type AuditEventId = DomainId<'AuditEvent'>;
export type MutationId = DomainId<'Mutation'>;
export type SyncConflictId = DomainId<'SyncConflict'>;
export type CorrelationId = DomainId<'Correlation'>;

export function toDomainId<T extends DomainId<string>>(value: string): T {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error('Domain IDs cannot be blank');
  }

  if (normalized.length > 128) {
    throw new Error('Domain IDs cannot exceed 128 characters');
  }

  return normalized as T;
}
