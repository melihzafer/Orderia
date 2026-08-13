import { FulfillmentGroup, MenuItem, OrderItem } from '../../domain';

export type OrderView = 'all' | 'kitchen' | 'drinks' | 'new';

export interface OrderViewCounts {
  readonly all: number;
  readonly kitchen: number;
  readonly drinks: number;
  readonly new: number;
}

export function getFulfillmentGroup(
  product?: Pick<MenuItem, 'fulfillmentGroup'>,
): FulfillmentGroup {
  return product?.fulfillmentGroup ?? 'kitchen';
}

/**
 * Kaç adedin masaya götürüldüğü — `servedQuantity` yerine HER ZAMAN bunu oku.
 *
 * `status: 'served'` satırın tamamının gittiği anlamına gelir: hem bu alan hiç
 * yokken yazılmış eski satırlar hem de içeceklerin toplu "götürüldü" komutu
 * (`markOrderItemsServed`) böyle görünür, ikisi de `servedQuantity` yazmaz.
 * Üst sınıra kırpmak ayrıca satır bölündüğünde (`voidOrderItemQuantity`
 * kalan adedi düşürür) sayacın adedi aşmasını engeller.
 */
export function servedCount(
  item: Pick<OrderItem, 'status' | 'quantity' | 'servedQuantity'>,
): number {
  if (item.status === 'cancelled') return 0;
  if (item.status === 'served') return item.quantity;
  return Math.min(Math.max(item.servedQuantity ?? 0, 0), item.quantity);
}

export function isFullyServed(
  item: Pick<OrderItem, 'status' | 'quantity' | 'servedQuantity'>,
): boolean {
  return item.status !== 'cancelled' && servedCount(item) >= item.quantity;
}

export function getLatestOrderBatchId(
  items: readonly OrderItem[],
): OrderItem['orderBatchId'] | undefined {
  return items.reduce<OrderItem | undefined>(
    (latest, item) => (latest && latest.createdAt >= item.createdAt ? latest : item),
    undefined,
  )?.orderBatchId;
}

export function countOrderViews(
  items: readonly OrderItem[],
  itemGroups: Readonly<Record<string, FulfillmentGroup>>,
): OrderViewCounts {
  const latestBatchId = getLatestOrderBatchId(items);
  return {
    all: items.length,
    kitchen: items.filter((item) => itemGroups[item.id] !== 'drinks').length,
    drinks: items.filter((item) => itemGroups[item.id] === 'drinks').length,
    new: latestBatchId ? items.filter((item) => item.orderBatchId === latestBatchId).length : 0,
  };
}

export function filterOrderItems(
  items: readonly OrderItem[],
  view: OrderView,
  itemGroups: Readonly<Record<string, FulfillmentGroup>>,
): readonly OrderItem[] {
  if (view === 'all') return items;
  const latestBatchId = view === 'new' ? getLatestOrderBatchId(items) : undefined;
  return items.filter((item) => {
    if (view === 'new') return item.orderBatchId === latestBatchId;
    if (view === 'drinks') return itemGroups[item.id] === 'drinks';
    return itemGroups[item.id] !== 'drinks';
  });
}
