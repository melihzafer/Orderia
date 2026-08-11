import {
  BranchId,
  CancellationReason,
  CancellationReasonId,
  DeviceId,
  MenuCategory,
  MenuCategoryId,
  MenuItem,
  MenuItemId,
  ModifierGroup,
  ModifierGroupId,
  ModifierOption,
  ModifierOptionId,
  OrganizationId,
  RestaurantTable,
  RestaurantTableId,
  UserId,
  toCurrencyCode,
  toDomainId,
} from '../domain';
import { RepositoryScope } from '../data/contracts';
import { InMemoryLocalDatabase } from '../data/testing/inMemoryLocalDatabase';

/**
 * Masa çalışma alanı testleri için ortak tohum veri.
 *
 * `orderCommands.test.ts` ve `checkCommands.test.ts` bu kurulumu satır satır
 * kopyalıyordu. Ekran testleri de aynısına ihtiyaç duyduğu için üçüncü bir
 * kopya çıkarmak yerine buraya taşındı.
 */

export const seedIds = {
  organizationId: toDomainId<OrganizationId>('organization-1'),
  branchId: toDomainId<BranchId>('branch-1'),
  userId: toDomainId<UserId>('waiter-1'),
  deviceId: toDomainId<DeviceId>('device-1'),
  tableId: toDomainId<RestaurantTableId>('table-1'),
  otherTableId: toDomainId<RestaurantTableId>('table-2'),
  categoryId: toDomainId<MenuCategoryId>('category-1'),
  productId: toDomainId<MenuItemId>('product-1'),
  plainProductId: toDomainId<MenuItemId>('product-2'),
  groupId: toDomainId<ModifierGroupId>('group-1'),
  optionId: toDomainId<ModifierOptionId>('option-1'),
  reasonId: toDomainId<CancellationReasonId>('reason-1'),
  managerReasonId: toDomainId<CancellationReasonId>('reason-2'),
} as const;

export const seedScope: Required<RepositoryScope> = {
  organizationId: seedIds.organizationId,
  branchId: seedIds.branchId,
};

export const seedTimestamp = '2026-07-26T18:00:00.000Z';

const base = {
  ...seedScope,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
  syncStatus: 'synced',
} as const;

/**
 * Tek masalı, tek kategorili, iki ürünlü bir şube kurar.
 *
 * `product-1` zorunlu bir modifier grubu taşır (seçenek modalını tetikler),
 * `product-2` düz bir üründür — tek dokunuşla taslağa eklenir. Ekran testleri
 * çoğunlukla ikincisini kullanır.
 */
export async function seedTableWorkspace(database: InMemoryLocalDatabase): Promise<void> {
  const table: RestaurantTable = {
    ...base,
    id: seedIds.tableId,
    hallId: toDomainId('hall-1'),
    label: 'Masa 4',
    sequenceNumber: 4,
    sortOrder: 4,
    version: 1,
  };
  const otherTable: RestaurantTable = {
    ...base,
    id: seedIds.otherTableId,
    hallId: toDomainId('hall-1'),
    label: 'Masa 5',
    sequenceNumber: 5,
    sortOrder: 5,
    version: 1,
  };
  const category: MenuCategory = {
    ...base,
    id: seedIds.categoryId,
    name: 'Atıştırmalık',
    sortOrder: 1,
    isActive: true,
    createdBy: seedIds.userId,
    version: 2,
  };
  const product: MenuItem = {
    ...base,
    id: seedIds.productId,
    categoryId: seedIds.categoryId,
    name: 'Patates kızartması',
    priceMinor: 400,
    currencyCode: toCurrencyCode('EUR'),
    taxRateBasisPoints: 2000,
    isActive: true,
    isAvailable: true,
    createdBy: seedIds.userId,
    version: 3,
  };
  const plainProduct: MenuItem = {
    ...base,
    id: seedIds.plainProductId,
    categoryId: seedIds.categoryId,
    name: 'Çay',
    priceMinor: 150,
    currencyCode: toCurrencyCode('EUR'),
    taxRateBasisPoints: 2000,
    isActive: true,
    isAvailable: true,
    createdBy: seedIds.userId,
    version: 1,
  };
  const group: ModifierGroup = {
    ...base,
    id: seedIds.groupId,
    menuItemId: seedIds.productId,
    name: 'Peynir',
    selectionType: 'single',
    minimumChoices: 1,
    maximumChoices: 1,
    isRequired: true,
    sortOrder: 1,
    version: 1,
  };
  const option: ModifierOption = {
    ...base,
    id: seedIds.optionId,
    modifierGroupId: seedIds.groupId,
    name: 'Peynirli',
    priceDeltaMinor: 100,
    isDefault: true,
    isActive: true,
    sortOrder: 1,
    version: 1,
  };
  const reason: CancellationReason = {
    ...base,
    id: seedIds.reasonId,
    name: 'Müşteri vazgeçti',
    requiresManager: false,
    isActive: true,
    version: 1,
  };
  const managerReason: CancellationReason = {
    ...base,
    id: seedIds.managerReasonId,
    name: 'Kasa hatası',
    requiresManager: true,
    isActive: true,
    version: 1,
  };

  await database.transaction(async (transaction) => {
    await transaction.repository('restaurantTables').put(seedScope, table);
    await transaction.repository('restaurantTables').put(seedScope, otherTable);
    await transaction.repository('menuCategories').put(seedScope, category);
    await transaction.repository('menuItems').put(seedScope, product);
    await transaction.repository('menuItems').put(seedScope, plainProduct);
    await transaction.repository('modifierGroups').put(seedScope, group);
    await transaction.repository('modifierOptions').put(seedScope, option);
    await transaction.repository('cancellationReasons').put(seedScope, reason);
    await transaction.repository('cancellationReasons').put(seedScope, managerReason);
  });
}

/** Testler arasında çakışmayan, deterministik kimlik üretici. */
export function sequentialIds(prefix = 'generated'): () => string {
  let index = 0;
  return () => `${prefix}-${++index}`;
}
