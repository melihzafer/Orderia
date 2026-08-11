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
} from '../../../domain';
import { RepositoryScope } from '../../../data/contracts';
import { InMemoryLocalDatabase } from '../../../data/testing/inMemoryLocalDatabase';
import { renameCheck, voidCheck } from '../checkCommands';
import { sendOrderBatch } from '../orderCommands';
import { loadTableWorkspace } from '../workspaceModel';

/**
 * `renameCheck`/`voidCheck` yeni komutlar; `orderCommands.test.ts`'teki
 * kurulum yardımcılarını aynen izler.
 */

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const userId = toDomainId<UserId>('waiter-1');
const deviceId = toDomainId<DeviceId>('device-1');
const tableId = toDomainId<RestaurantTableId>('table-1');
const categoryId = toDomainId<MenuCategoryId>('category-1');
const productId = toDomainId<MenuItemId>('product-1');
const groupId = toDomainId<ModifierGroupId>('group-1');
const optionId = toDomainId<ModifierOptionId>('option-1');
const reasonId = toDomainId<CancellationReasonId>('reason-1');
const scope: Required<RepositoryScope> = { organizationId, branchId };
const timestamp = '2026-07-26T18:00:00.000Z';

describe('checkCommands', () => {
  describe('renameCheck', () => {
    it('renames an open check with a version bump and a queued mutation', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1');

      const renamed = await renameCheck({
        database,
        scope,
        deviceId,
        actorUserId: userId,
        check: sent.check,
        name: 'Teras masası',
        now: new Date('2026-07-26T18:05:00.000Z'),
        createUuid: () => 'rename-mutation',
      });

      expect(renamed).toMatchObject({ name: 'Teras masası', version: 2 });
      expect(await database.outbox.list(scope, ['pending'])).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entityId: sent.check.id,
            payload: { name: 'Teras masası' },
            repository: 'checks',
          }),
        ]),
      );
    });

    it('rejects a blank name', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1');

      await expect(
        renameCheck({
          database,
          scope,
          deviceId,
          actorUserId: userId,
          check: sent.check,
          name: '   ',
        }),
      ).rejects.toThrow('A check name is required');
    });

    it('rejects renaming a check that is not open', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1');

      await expect(
        renameCheck({
          database,
          scope,
          deviceId,
          actorUserId: userId,
          check: { ...sent.check, status: 'paid' },
          name: 'Yeni isim',
        }),
      ).rejects.toThrow('Only an open check can be renamed');
    });
  });

  describe('voidCheck', () => {
    it('cancels every active line and voids the check with the same reason', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1', 2);

      const result = await voidCheck({
        database,
        scope,
        deviceId,
        actorUserId: userId,
        check: sent.check,
        items: sent.items,
        modifiers: [],
        reasonId,
        hasConfirmedPayments: false,
        now: new Date('2026-07-26T18:05:00.000Z'),
        createUuid: sequentialIds('void'),
      });

      expect(result.check).toMatchObject({ status: 'voided', version: 2 });
      expect(result.voidedItems).toHaveLength(1);
      expect(result.voidedItems[0]).toMatchObject({
        cancellationReasonId: reasonId,
        status: 'cancelled',
      });

      // loadTableWorkspace yalnizca aktif (open/partially_paid) hesaplari
      // adisyona getirir; voided hesap seridi terk etmeli.
      const reloaded = await loadTableWorkspace(database, scope, tableId);
      expect(reloaded?.checks.some((check) => check.id === sent.check.id)).toBe(false);

      const storedCheck = await database.repository('checks').getById(scope, sent.check.id);
      expect(storedCheck).toMatchObject({ status: 'voided' });
      const storedItem = await database.repository('orderItems').getById(scope, sent.items[0].id);
      expect(storedItem).toMatchObject({ status: 'cancelled', cancellationReasonId: reasonId });
    });

    it('rejects voiding a check that already has a confirmed payment', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1');

      await expect(
        voidCheck({
          database,
          scope,
          deviceId,
          actorUserId: userId,
          check: sent.check,
          items: sent.items,
          modifiers: [],
          reasonId,
          hasConfirmedPayments: true,
        }),
      ).rejects.toThrow('A check with confirmed payments cannot be voided');
    });

    it('rejects voiding a check that is already paid', async () => {
      const database = new InMemoryLocalDatabase();
      await seedWorkspace(database);
      const sent = await sendCheck(database, 'Hesap 1');

      await expect(
        voidCheck({
          database,
          scope,
          deviceId,
          actorUserId: userId,
          check: { ...sent.check, status: 'paid' },
          items: sent.items,
          modifiers: [],
          reasonId,
          hasConfirmedPayments: false,
        }),
      ).rejects.toThrow();
    });
  });
});

async function sendCheck(database: InMemoryLocalDatabase, checkName: string, quantity = 1) {
  const workspace = await loadTableWorkspace(database, scope, tableId);
  return sendOrderBatch({
    database,
    scope,
    deviceId,
    actorUserId: userId,
    tableId,
    checkName,
    lines: [
      {
        id: 'draft-1',
        product: workspace!.products[0],
        quantity,
        selectedOptionIds: [optionId],
      },
    ],
    now: new Date(timestamp),
    createUuid: sequentialIds(),
  });
}

async function seedWorkspace(database: InMemoryLocalDatabase): Promise<void> {
  const table: RestaurantTable = {
    id: tableId,
    ...scope,
    hallId: toDomainId('hall-1'),
    label: 'Masa 4',
    sequenceNumber: 4,
    sortOrder: 4,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const category: MenuCategory = {
    id: categoryId,
    ...scope,
    name: 'Atıştırmalık',
    sortOrder: 1,
    isActive: true,
    createdBy: userId,
    version: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const product: MenuItem = {
    id: productId,
    ...scope,
    categoryId,
    name: 'Patates kızartması',
    priceMinor: 400,
    currencyCode: toCurrencyCode('EUR'),
    taxRateBasisPoints: 2000,
    isActive: true,
    isAvailable: true,
    createdBy: userId,
    version: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const group: ModifierGroup = {
    id: groupId,
    ...scope,
    menuItemId: productId,
    name: 'Peynir',
    selectionType: 'single',
    minimumChoices: 1,
    maximumChoices: 1,
    isRequired: true,
    sortOrder: 1,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const option: ModifierOption = {
    id: optionId,
    ...scope,
    modifierGroupId: groupId,
    name: 'Peynirli',
    priceDeltaMinor: 100,
    isDefault: true,
    isActive: true,
    sortOrder: 1,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const reason: CancellationReason = {
    id: reasonId,
    ...scope,
    name: 'Müşteri vazgeçti',
    requiresManager: false,
    isActive: true,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };

  await database.transaction(async (transaction) => {
    await transaction.repository('restaurantTables').put(scope, table);
    await transaction.repository('menuCategories').put(scope, category);
    await transaction.repository('menuItems').put(scope, product);
    await transaction.repository('modifierGroups').put(scope, group);
    await transaction.repository('modifierOptions').put(scope, option);
    await transaction.repository('cancellationReasons').put(scope, reason);
  });
}

function sequentialIds(prefix = 'generated'): () => string {
  let index = 0;
  return () => `${prefix}-${++index}`;
}
