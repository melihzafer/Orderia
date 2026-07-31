import {
  CancellationReason,
  Check,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  ModifierOption,
  OrderItem,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
  RestaurantTable,
  RestaurantTableId,
  TableSession,
} from '../../domain';
import {
  DomainEntityMap,
  LocalDatabase,
  RepositoryName,
  RepositoryScope,
  SyncConflict,
} from '../../data/contracts';

export interface WorkspaceModifierGroup extends ModifierGroup {
  readonly options: readonly ModifierOption[];
}

export interface WorkspaceProduct extends MenuItem {
  readonly categoryName: string;
  readonly modifierGroups: readonly WorkspaceModifierGroup[];
}

export interface TableWorkspaceSnapshot {
  readonly table: RestaurantTable;
  readonly tables: readonly RestaurantTable[];
  readonly activeSessions: readonly TableSession[];
  readonly session?: TableSession;
  readonly sessionChecks: readonly Check[];
  readonly checks: readonly Check[];
  readonly orderItems: readonly OrderItem[];
  readonly orderItemModifiers: readonly OrderItemModifier[];
  readonly payments: readonly Payment[];
  readonly paymentAllocations: readonly PaymentAllocation[];
  readonly categories: readonly MenuCategory[];
  readonly products: readonly WorkspaceProduct[];
  readonly cancellationReasons: readonly CancellationReason[];
  readonly conflicts: readonly SyncConflict[];
}

export async function loadTableWorkspace(
  database: LocalDatabase,
  scope: Required<RepositoryScope>,
  tableId: RestaurantTableId,
): Promise<TableWorkspaceSnapshot | null> {
  const [
    restaurantTables,
    sessions,
    checks,
    orderItems,
    orderItemModifiers,
    payments,
    paymentAllocations,
    categories,
    menuItems,
    modifierGroups,
    modifierOptions,
    cancellationReasons,
    conflicts,
  ] = await Promise.all([
    loadAll(database, 'restaurantTables', scope),
    loadAll(database, 'tableSessions', scope),
    loadAll(database, 'checks', scope),
    loadAll(database, 'orderItems', scope),
    loadAll(database, 'orderItemModifiers', scope),
    loadAll(database, 'payments', scope),
    loadAll(database, 'paymentAllocations', scope),
    loadAll(database, 'menuCategories', scope),
    loadAll(database, 'menuItems', scope),
    loadAll(database, 'modifierGroups', scope),
    loadAll(database, 'modifierOptions', scope),
    loadAll(database, 'cancellationReasons', scope),
    database.syncState.listConflicts(scope, ['unresolved']),
  ]);
  const table = restaurantTables.find((candidate) => candidate.id === tableId);
  if (!table || table.deletedAt) return null;

  const activeSessions = sessions.filter(
    (candidate) =>
      (candidate.status === 'open' || candidate.status === 'payment_pending') &&
      !candidate.deletedAt,
  );
  const session = activeSessions
    .filter((candidate) => candidate.tableId === table.id)
    .sort((left, right) => right.openedAt.localeCompare(left.openedAt))[0];
  const sessionChecks = session
    ? checks
        .filter((check) => check.tableSessionId === session.id && !check.deletedAt)
        .sort((left, right) => left.openedAt.localeCompare(right.openedAt))
    : [];
  const activeChecks = sessionChecks.filter(
    (check) => check.status === 'open' || check.status === 'partially_paid',
  );
  const checkIds = new Set(activeChecks.map((check) => check.id));
  const activeItems = orderItems
    .filter((item) => checkIds.has(item.checkId) && !item.deletedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const itemIds = new Set(activeItems.map((item) => item.id));
  const activePayments = session
    ? payments.filter((payment) => payment.tableSessionId === session.id)
    : [];
  const paymentIds = new Set(activePayments.map((payment) => payment.id));
  const categoryById = new Map(
    categories
      .filter((category) => category.isActive && !category.deletedAt)
      .map((category) => [category.id, category]),
  );
  const activeGroups = modifierGroups.filter((group) => !group.deletedAt);
  const activeOptions = modifierOptions.filter((option) => option.isActive && !option.deletedAt);
  // Tukenen urun paletten kaybolmaz. Kaybolursa garson "menude yoktu"
  // sanip aramaya devam eder; gorunur ama kapali olursa "bugun yok" bilgisi
  // masada aninda verilir.
  const products = menuItems
    .filter((item) => item.isActive && !item.deletedAt && categoryById.has(item.categoryId))
    .map<WorkspaceProduct>((item) => ({
      ...item,
      categoryName: categoryById.get(item.categoryId)?.name ?? '',
      modifierGroups: activeGroups
        .filter((group) => group.menuItemId === item.id)
        .sort(compareSortOrder)
        .map((group) => ({
          ...group,
          options: activeOptions
            .filter((option) => option.modifierGroupId === group.id)
            .sort(compareSortOrder),
        })),
    }))
    .sort(
      (left, right) =>
        Number(right.isAvailable) - Number(left.isAvailable) || left.name.localeCompare(right.name),
    );

  return {
    table,
    tables: restaurantTables
      .filter((candidate) => !candidate.deletedAt)
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
      ),
    activeSessions,
    ...(session ? { session } : {}),
    sessionChecks,
    checks: activeChecks,
    orderItems: activeItems,
    orderItemModifiers: orderItemModifiers.filter((modifier) => itemIds.has(modifier.orderItemId)),
    payments: activePayments,
    paymentAllocations: paymentAllocations.filter((allocation) =>
      paymentIds.has(allocation.paymentId),
    ),
    categories: [...categoryById.values()].sort(compareSortOrder),
    products,
    cancellationReasons: cancellationReasons
      .filter((reason) => reason.isActive && !reason.deletedAt)
      .sort((left, right) => left.name.localeCompare(right.name)),
    conflicts: conflicts.filter((conflict) => itemIds.has(conflict.entityId as OrderItem['id'])),
  };
}

async function loadAll<Name extends RepositoryName>(
  database: LocalDatabase,
  repository: Name,
  scope: Required<RepositoryScope>,
): Promise<readonly DomainEntityMap[Name][]> {
  const records: DomainEntityMap[Name][] = [];
  let after: string | undefined;

  do {
    const page = await database.repository(repository).list(scope, {
      ...(after ? { after } : {}),
      limit: 500,
    });
    records.push(...page.items);
    after = page.nextCursor;
  } while (after);

  return records;
}

function compareSortOrder(
  left: { readonly sortOrder: number; readonly name: string },
  right: { readonly sortOrder: number; readonly name: string },
): number {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}
