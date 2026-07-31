import {
  Check,
  CheckId,
  CurrencyCode,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
  calculateOrderItemTotal,
  getConfirmedPaymentIds,
} from '../../domain';

/**
 * Adisyon bolme: bir adisyondaki kalemleri (veya kalemin bir kismini) baska bir
 * adisyona tasima plani. Garson "bu bira Ali'nin, su kola Ayse'nin" derken
 * satirlari karsilastirarak tasir; plan once saf fonksiyonlarla dogrulanir,
 * sonra komut katmani yazar.
 */

export type CheckSplitErrorCode =
  | 'EMPTY_SELECTION'
  | 'SOURCE_CHECK_LOCKED'
  | 'TARGET_CHECK_LOCKED'
  | 'TARGET_SAME_AS_SOURCE'
  | 'TARGET_OTHER_SESSION'
  | 'TARGET_NAME_REQUIRED'
  | 'ITEM_NOT_IN_CHECK'
  | 'ITEM_CANCELLED'
  | 'ITEM_ALREADY_PAID'
  | 'INVALID_QUANTITY'
  | 'CURRENCY_MISMATCH'
  | 'NOTHING_LEFT_TO_MOVE';

export class CheckSplitValidationError extends Error {
  constructor(
    message: string,
    readonly code: CheckSplitErrorCode,
    readonly orderItemId?: OrderItemId,
  ) {
    super(message);
    this.name = 'CheckSplitValidationError';
  }
}

export interface SplittableOrderItem {
  readonly item: OrderItem;
  /** Bir adetlik tutar (urun + secenekler). */
  readonly unitTotalMinor: number;
  /** Odenmemis ve iptal edilmemis, tasinabilir adet. */
  readonly movableQuantity: number;
  /** Odemeye kilitlenmis adet; tasinamaz. */
  readonly lockedQuantity: number;
  readonly movableTotalMinor: number;
  readonly modifiers: readonly OrderItemModifier[];
}

export interface CheckSplitMoveRequest {
  readonly orderItemId: OrderItemId;
  readonly quantity: number;
}

export type CheckSplitLineMode = 'move' | 'split';

export interface CheckSplitLinePlan {
  readonly sourceItem: OrderItem;
  readonly unitTotalMinor: number;
  readonly movedQuantity: number;
  /** Kaynak adisyonda kalan adet. 0 ise satirin tamami tasinir. */
  readonly remainingQuantity: number;
  readonly mode: CheckSplitLineMode;
  readonly movedTotalMinor: number;
  readonly modifiers: readonly OrderItemModifier[];
}

export interface CheckSplitPlan {
  readonly sourceCheckId: CheckId;
  /** Var olan adisyona tasiniyorsa dolu; yeni adisyon aciliyorsa bos. */
  readonly targetCheckId?: CheckId;
  readonly targetCheckName: string;
  readonly lines: readonly CheckSplitLinePlan[];
  readonly movedTotalMinor: number;
  readonly sourceRemainingTotalMinor: number;
  readonly currencyCode: CurrencyCode;
  /** Kaynak adisyonda tasinabilir hicbir kalem kalmiyorsa true. */
  readonly emptiesSourceCheck: boolean;
}

export interface BuildCheckSplitPlanInput {
  readonly sourceCheck: Check;
  readonly targetCheck?: Check;
  readonly targetCheckName?: string;
  readonly items: readonly OrderItem[];
  readonly modifiers: readonly OrderItemModifier[];
  readonly payments: readonly Payment[];
  readonly allocations: readonly PaymentAllocation[];
  readonly moves: readonly CheckSplitMoveRequest[];
}

const MOVABLE_CHECK_STATUSES = new Set<Check['status']>(['open', 'partially_paid']);

/**
 * Bir adisyonun hangi kalemlerinin ne kadarinin tasinabilecegini cikarir.
 * Odemesi onaylanmis adetler kilitlidir; bolme ekrani bunlari gri gosterir.
 */
export function buildSplittableOrderItems(
  check: Check,
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
  payments: readonly Payment[],
  allocations: readonly PaymentAllocation[],
): readonly SplittableOrderItem[] {
  const confirmedPaymentIds = getConfirmedPaymentIds(payments);

  return items
    .filter((item) => item.checkId === check.id && item.status !== 'cancelled' && !item.deletedAt)
    .map((item) => {
      const unitTotalMinor = unitTotalOf(item, modifiers);
      const itemAllocations = allocations.filter(
        (allocation) =>
          allocation.orderItemId === item.id && confirmedPaymentIds.has(allocation.paymentId),
      );
      // Odemesi onaylanmis bir kalem hic tasinmaz: kismen odenmis satiri
      // bolmek fis izini kopartir. Sunucu da ayni kurali uygular.
      const lockedQuantity = itemAllocations.length > 0 ? item.quantity : 0;
      const movableQuantity = item.quantity - lockedQuantity;

      return {
        item,
        unitTotalMinor,
        movableQuantity,
        lockedQuantity,
        movableTotalMinor: unitTotalMinor * movableQuantity,
        modifiers: modifiers.filter((modifier) => modifier.orderItemId === item.id),
      };
    });
}

export function buildCheckSplitPlan(input: BuildCheckSplitPlanInput): CheckSplitPlan {
  const { sourceCheck, targetCheck } = input;

  if (!MOVABLE_CHECK_STATUSES.has(sourceCheck.status)) {
    throw new CheckSplitValidationError(
      `Check ${sourceCheck.id} is ${sourceCheck.status} and cannot be split`,
      'SOURCE_CHECK_LOCKED',
    );
  }
  if (targetCheck) {
    if (targetCheck.id === sourceCheck.id) {
      throw new CheckSplitValidationError(
        'The target check must differ from the source check',
        'TARGET_SAME_AS_SOURCE',
      );
    }
    if (targetCheck.tableSessionId !== sourceCheck.tableSessionId) {
      throw new CheckSplitValidationError(
        'The target check belongs to another table session',
        'TARGET_OTHER_SESSION',
      );
    }
    if (!MOVABLE_CHECK_STATUSES.has(targetCheck.status)) {
      throw new CheckSplitValidationError(
        `Check ${targetCheck.id} is ${targetCheck.status} and cannot receive items`,
        'TARGET_CHECK_LOCKED',
      );
    }
  }

  const targetCheckName = (targetCheck?.name ?? input.targetCheckName ?? '').trim();
  if (!targetCheckName) {
    throw new CheckSplitValidationError('A target check name is required', 'TARGET_NAME_REQUIRED');
  }

  const requested = normalizeMoves(input.moves);
  if (requested.size === 0) {
    throw new CheckSplitValidationError('Select at least one item to move', 'EMPTY_SELECTION');
  }

  const splittable = buildSplittableOrderItems(
    sourceCheck,
    input.items,
    input.modifiers,
    input.payments,
    input.allocations,
  );
  const splittableById = new Map(splittable.map((entry) => [entry.item.id, entry]));

  const lines = [...requested.entries()].map<CheckSplitLinePlan>(([orderItemId, quantity]) => {
    const entry = splittableById.get(orderItemId);
    if (!entry) {
      const known = input.items.find((item) => item.id === orderItemId);
      if (known && known.status === 'cancelled') {
        throw new CheckSplitValidationError(
          `Order item ${orderItemId} is cancelled and cannot be moved`,
          'ITEM_CANCELLED',
          orderItemId,
        );
      }
      throw new CheckSplitValidationError(
        `Order item ${orderItemId} does not belong to check ${sourceCheck.id}`,
        'ITEM_NOT_IN_CHECK',
        orderItemId,
      );
    }
    if (entry.movableQuantity === 0) {
      throw new CheckSplitValidationError(
        `Order item ${orderItemId} is already paid and cannot be moved`,
        'ITEM_ALREADY_PAID',
        orderItemId,
      );
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > entry.movableQuantity) {
      throw new CheckSplitValidationError(
        `Move quantity for ${entry.item.nameSnapshot} must be between 1 and ${entry.movableQuantity}`,
        'INVALID_QUANTITY',
        orderItemId,
      );
    }

    const remainingQuantity = entry.item.quantity - quantity;
    return {
      sourceItem: entry.item,
      unitTotalMinor: entry.unitTotalMinor,
      movedQuantity: quantity,
      remainingQuantity,
      mode: remainingQuantity === 0 ? 'move' : 'split',
      movedTotalMinor: entry.unitTotalMinor * quantity,
      modifiers: input.modifiers.filter((modifier) => modifier.orderItemId === entry.item.id),
    };
  });

  const currencyCode = assertSingleCurrency(lines, targetCheck, input.items);
  const movedTotalMinor = lines.reduce((total, line) => total + line.movedTotalMinor, 0);
  const sourceRemainingTotalMinor = splittable.reduce((total, entry) => {
    const moved = requested.get(entry.item.id) ?? 0;
    return total + entry.unitTotalMinor * (entry.item.quantity - moved);
  }, 0);
  const emptiesSourceCheck = splittable.every(
    (entry) => entry.item.quantity - (requested.get(entry.item.id) ?? 0) === 0,
  );

  return {
    sourceCheckId: sourceCheck.id,
    ...(targetCheck ? { targetCheckId: targetCheck.id } : {}),
    targetCheckName,
    lines,
    movedTotalMinor,
    sourceRemainingTotalMinor,
    currencyCode,
    emptiesSourceCheck,
  };
}

/**
 * "Herkes kendi hesabini odesin" kisayolu: tasinabilir kalemleri, kalem
 * notundaki kisi etiketine gore gruplar. Etiketsiz kalemler disarida kalir ve
 * garson bunlari elle dagitir.
 */
export function groupSplittableItemsByNote(
  splittable: readonly SplittableOrderItem[],
): ReadonlyMap<string, readonly SplittableOrderItem[]> {
  const groups = new Map<string, SplittableOrderItem[]>();
  splittable.forEach((entry) => {
    const label = entry.item.note?.trim();
    if (!label) return;
    const bucket = groups.get(label);
    if (bucket) {
      bucket.push(entry);
      return;
    }
    groups.set(label, [entry]);
  });
  return groups;
}

function normalizeMoves(moves: readonly CheckSplitMoveRequest[]): ReadonlyMap<OrderItemId, number> {
  const normalized = new Map<OrderItemId, number>();
  moves.forEach((move) => {
    if (move.quantity === 0) return;
    normalized.set(move.orderItemId, (normalized.get(move.orderItemId) ?? 0) + move.quantity);
  });
  return normalized;
}

function unitTotalOf(item: OrderItem, modifiers: readonly OrderItemModifier[]): number {
  const totalMinor = calculateOrderItemTotal(item, modifiers);
  const unitTotalMinor = totalMinor / item.quantity;
  if (!Number.isSafeInteger(unitTotalMinor)) {
    throw new Error(`order item ${item.id} does not have an integral unit total`);
  }
  return unitTotalMinor;
}

function assertSingleCurrency(
  lines: readonly CheckSplitLinePlan[],
  targetCheck: Check | undefined,
  items: readonly OrderItem[],
): CurrencyCode {
  const currencyCode = lines[0].sourceItem.currencyCode;
  lines.slice(1).forEach((line) => {
    if (line.sourceItem.currencyCode !== currencyCode) {
      throw new CheckSplitValidationError(
        'All moved items must share one currency',
        'CURRENCY_MISMATCH',
        line.sourceItem.id,
      );
    }
  });

  if (targetCheck) {
    const targetCurrency = items.find(
      (item) => item.checkId === targetCheck.id && item.status !== 'cancelled',
    )?.currencyCode;
    if (targetCurrency && targetCurrency !== currencyCode) {
      throw new CheckSplitValidationError(
        'The target check uses a different currency',
        'CURRENCY_MISMATCH',
      );
    }
  }

  return currencyCode;
}
