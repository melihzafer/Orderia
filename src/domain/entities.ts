import { BusinessDate, BusinessDayCutoff } from './businessDate';
import {
  AuditEventId,
  BranchId,
  CancellationReasonId,
  CheckId,
  CorrelationId,
  DeviceId,
  HallId,
  MembershipId,
  MenuCategoryId,
  MenuItemId,
  ModifierGroupId,
  ModifierOptionId,
  MutationId,
  OrderBatchId,
  OrderItemId,
  OrderItemModifierId,
  OrganizationId,
  PaymentAllocationId,
  PaymentId,
  ReceiptId,
  RestaurantTableId,
  TableSessionId,
  UserId,
} from './ids';
import { CurrencyCode } from './money';

export type IsoTimestamp = string;
export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export type OrganizationPlan = 'trial' | 'starter' | 'growth' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'closed';
export type BranchStatus = 'active' | 'suspended' | 'closed';
export type MembershipRole = 'waiter' | 'manager';
export type MembershipStatus = 'invited' | 'active' | 'suspended';
export type DevicePlatform = 'android' | 'ios_web' | 'web';
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'rejected';
export type TableSessionStatus = 'open' | 'payment_pending' | 'closed' | 'voided';
export type CheckStatus = 'open' | 'partially_paid' | 'paid' | 'voided';
export type OrderItemStatus = 'draft' | 'ordered' | 'served' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'mixed_adjustment';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'voided';
export type ReceiptStatus = 'issued' | 'adjusted' | 'voided';
export type ModifierSelectionType = 'single' | 'multiple';

export interface VersionedMetadata {
  readonly version: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly deletedAt?: IsoTimestamp;
}

export interface SyncMetadata {
  readonly syncStatus: SyncStatus;
  readonly clientMutationId?: MutationId;
  readonly serverVersion?: number;
  readonly lastSyncedAt?: IsoTimestamp;
}

export interface TenantScope {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
}

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly plan: OrganizationPlan;
  readonly status: OrganizationStatus;
  readonly createdAt: IsoTimestamp;
}

export interface Branch extends VersionedMetadata {
  readonly id: BranchId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly timezone: string;
  readonly currencyCode: CurrencyCode;
  readonly businessDayCutoff: BusinessDayCutoff;
  readonly receiptPrefix: string;
  readonly status: BranchStatus;
  readonly allowOfflinePayments: boolean;
}

export interface Profile {
  readonly id: UserId;
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl?: string;
  readonly locale: string;
  readonly createdAt: IsoTimestamp;
}

export interface Membership {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly branchId?: BranchId;
  readonly userId: UserId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
  readonly createdAt: IsoTimestamp;
  readonly deletedAt?: IsoTimestamp;
}

export interface Device extends TenantScope {
  readonly id: DeviceId;
  readonly userId: UserId;
  readonly platform: DevicePlatform;
  readonly appVersion: string;
  readonly lastSeenAt: IsoTimestamp;
  readonly lastSyncAt?: IsoTimestamp;
  readonly pushEndpoint?: string;
  readonly revokedAt?: IsoTimestamp;
}

export interface Hall extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: HallId;
  readonly name: string;
  readonly sortOrder: number;
}

export interface RestaurantTable extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: RestaurantTableId;
  readonly hallId: HallId;
  readonly label: string;
  readonly sequenceNumber: number;
  readonly capacity?: number;
  readonly sortOrder: number;
}

export interface MenuCategory extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: MenuCategoryId;
  readonly name: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly createdBy: UserId;
}

export interface MenuItem extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: MenuItemId;
  readonly categoryId: MenuCategoryId;
  readonly name: string;
  readonly description?: string;
  readonly priceMinor: number;
  readonly currencyCode: CurrencyCode;
  readonly taxRateBasisPoints: number;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly prepTimeMinutes?: number;
  readonly createdBy: UserId;
}

export interface ModifierGroup extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: ModifierGroupId;
  readonly menuItemId: MenuItemId;
  readonly name: string;
  readonly selectionType: ModifierSelectionType;
  readonly minimumChoices: number;
  readonly maximumChoices?: number;
  readonly isRequired: boolean;
  readonly sortOrder: number;
}

export interface ModifierOption extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: ModifierOptionId;
  readonly modifierGroupId: ModifierGroupId;
  readonly name: string;
  readonly priceDeltaMinor: number;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface CancellationReason extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: CancellationReasonId;
  readonly name: string;
  readonly requiresManager: boolean;
  readonly isActive: boolean;
}

export interface TableSession extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: TableSessionId;
  readonly tableId: RestaurantTableId;
  readonly status: TableSessionStatus;
  readonly openedBy: UserId;
  readonly openedAt: IsoTimestamp;
  readonly closedBy?: UserId;
  readonly closedAt?: IsoTimestamp;
  readonly guestCount?: number;
  readonly note?: string;
  readonly transferredFromTableId?: RestaurantTableId;
}

export interface SessionParticipant {
  readonly tableSessionId: TableSessionId;
  readonly userId: UserId;
  readonly firstActionAt: IsoTimestamp;
  readonly lastActionAt: IsoTimestamp;
}

export interface Check extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: CheckId;
  readonly tableSessionId: TableSessionId;
  readonly name: string;
  readonly note?: string;
  readonly status: CheckStatus;
  readonly openedBy: UserId;
  readonly openedAt: IsoTimestamp;
  readonly closedAt?: IsoTimestamp;
}

export interface OrderBatch extends TenantScope, SyncMetadata {
  readonly id: OrderBatchId;
  readonly tableSessionId: TableSessionId;
  readonly checkId: CheckId;
  readonly createdBy: UserId;
  readonly createdAt: IsoTimestamp;
  readonly clientMutationId: MutationId;
}

export interface OrderItem extends TenantScope, VersionedMetadata, SyncMetadata {
  readonly id: OrderItemId;
  readonly tableSessionId: TableSessionId;
  readonly checkId: CheckId;
  readonly orderBatchId: OrderBatchId;
  readonly menuItemId?: MenuItemId;
  readonly nameSnapshot: string;
  readonly categoryIdSnapshot?: MenuCategoryId;
  readonly categoryNameSnapshot?: string;
  readonly unitPriceMinor: number;
  readonly currencyCode: CurrencyCode;
  readonly taxRateBasisPoints: number;
  readonly quantity: number;
  readonly status: OrderItemStatus;
  readonly note?: string;
  readonly createdBy: UserId;
  readonly updatedBy: UserId;
  readonly cancelledBy?: UserId;
  readonly cancelledAt?: IsoTimestamp;
  readonly cancellationReasonId?: CancellationReasonId;
  readonly originalTableId: RestaurantTableId;
  readonly originalTableSessionId: TableSessionId;
}

export interface OrderItemModifier {
  readonly id: OrderItemModifierId;
  readonly orderItemId: OrderItemId;
  readonly modifierGroupNameSnapshot: string;
  readonly modifierOptionNameSnapshot: string;
  readonly priceDeltaMinor: number;
  readonly quantity: number;
}

export interface Payment extends TenantScope, SyncMetadata {
  readonly id: PaymentId;
  readonly tableSessionId: TableSessionId;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly amountMinor: number;
  readonly tenderedMinor?: number;
  readonly changeMinor?: number;
  readonly currencyCode: CurrencyCode;
  readonly createdBy: UserId;
  readonly createdAt: IsoTimestamp;
  readonly confirmedAt?: IsoTimestamp;
  readonly idempotencyKey: string;
  readonly deviceId: DeviceId;
}

export interface PaymentAllocation {
  readonly id: PaymentAllocationId;
  readonly paymentId: PaymentId;
  readonly checkId: CheckId;
  readonly orderItemId?: OrderItemId;
  readonly quantity?: number;
  readonly amountMinor: number;
}

export interface ReceiptSnapshotItem {
  readonly orderItemId: OrderItemId;
  readonly name: string;
  readonly modifiers: readonly {
    readonly name: string;
    readonly priceDeltaMinor: number;
    readonly quantity: number;
  }[];
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly lineTotalMinor: number;
}

export interface ReceiptSnapshotCheck {
  readonly checkId: CheckId;
  readonly name: string;
  readonly note?: string;
  readonly items: readonly ReceiptSnapshotItem[];
  readonly totalMinor: number;
}

export interface ReceiptSnapshotPayment {
  readonly paymentId: PaymentId;
  readonly method: PaymentMethod;
  readonly amountMinor: number;
  readonly confirmedAt: IsoTimestamp;
  readonly createdByDisplayName: string;
}

export interface ReceiptSnapshot {
  readonly schemaVersion: 1;
  readonly organizationName: string;
  readonly branchName: string;
  readonly branchTimezone: string;
  readonly tableLabel: string;
  readonly openedAt: IsoTimestamp;
  readonly issuedAt: IsoTimestamp;
  readonly waiterDisplayNames: readonly string[];
  readonly checks: readonly ReceiptSnapshotCheck[];
  readonly payments: readonly ReceiptSnapshotPayment[];
  readonly totalMinor: number;
  readonly currencyCode: CurrencyCode;
}

export interface Receipt extends TenantScope {
  readonly id: ReceiptId;
  readonly tableSessionId: TableSessionId;
  readonly checkId: CheckId;
  readonly receiptNumber: string;
  readonly businessDate: BusinessDate;
  readonly issuedAt: IsoTimestamp;
  readonly issuedBy: UserId;
  readonly totalMinor: number;
  readonly currencyCode: CurrencyCode;
  readonly snapshot: ReceiptSnapshot;
  readonly pdfStoragePath?: string;
  readonly pdfHash?: string;
  readonly status: ReceiptStatus;
  readonly adjustsReceiptId?: ReceiptId;
}

export interface AuditMetadata {
  readonly actorUserId: UserId;
  readonly deviceId: DeviceId;
  readonly occurredAt: IsoTimestamp;
  readonly clientMutationId: MutationId;
  readonly correlationId: CorrelationId;
}

export interface AuditEvent extends TenantScope, AuditMetadata {
  readonly id: AuditEventId;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly before?: JsonValue;
  readonly after?: JsonValue;
  readonly reason?: string;
}
