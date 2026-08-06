import { OrderItem, toDomainId } from '../../../domain';
import { countOrderViews, filterOrderItems, getFulfillmentGroup } from '../fulfillment';

const item = (id: string, batch: string, createdAt: string): OrderItem =>
  ({
    id: toDomainId('order-item-' + id),
    orderBatchId: toDomainId('order-batch-' + batch),
    createdAt,
  }) as OrderItem;

describe('order fulfillment views', () => {
  const items = [
    item('food-old', 'old', '2026-07-31T12:00:00.000Z'),
    item('drink-old', 'old', '2026-07-31T12:00:01.000Z'),
    item('food-new', 'new', '2026-07-31T12:10:00.000Z'),
  ];
  const groups = {
    [items[0].id]: 'kitchen' as const,
    [items[1].id]: 'drinks' as const,
    [items[2].id]: 'kitchen' as const,
  };

  it('defaults legacy products to the kitchen queue', () => {
    expect(getFulfillmentGroup()).toBe('kitchen');
    expect(getFulfillmentGroup({ fulfillmentGroup: 'drinks' })).toBe('drinks');
  });

  it('counts and filters all, kitchen, drinks, and newest batch views', () => {
    expect(countOrderViews(items, groups)).toEqual({
      all: 3,
      kitchen: 2,
      drinks: 1,
      new: 1,
    });
    expect(filterOrderItems(items, 'drinks', groups)).toEqual([items[1]]);
    expect(filterOrderItems(items, 'new', groups)).toEqual([items[2]]);
  });

  it('keeps unknown or legacy item groups in the kitchen view', () => {
    const withoutGroup = { [items[1].id]: 'drinks' as const };
    expect(filterOrderItems([items[0]], 'kitchen', withoutGroup)).toEqual([items[0]]);
  });
});
