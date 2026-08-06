export interface HoldRepeatTiming {
  /** Basılı tutmanın tekrara dönmesi için beklenen süre. */
  readonly delay: number;
  /** İlk tekrar aralığı. */
  readonly interval: number;
  /** Hızlanmadan sonraki aralık. */
  readonly fastInterval: number;
  /** Kaç adımdan sonra hızlanılacağı. */
  readonly accelerateAfter: number;
}

export const defaultHoldRepeatTiming: HoldRepeatTiming = {
  accelerateAfter: 6,
  delay: 380,
  fastInterval: 55,
  interval: 120,
};

export interface HoldRepeat {
  /** Parmak indiğinde çağrılır; gecikmeden sonra tekrar başlar. */
  start(): void;
  /** Parmak kalktığında ya da bileşen söküldüğünde çağrılır. */
  stop(): void;
  /**
   * Bu basış sırasında tekrar çalıştıysa `true` döner ve bayrağı sıfırlar.
   *
   * React Native parmak kalkarken `onPressOut`'u `onPress`'ten önce tetikliyor.
   * Bayrak `stop()` ile sıfırlansaydı, basılı tutup on adım atan kullanıcı parmağını
   * kaldırırken bir fazladan adım daha alırdı — bu yüzden ayrı tutuluyor.
   */
  consumeRepeated(): boolean;
}

/**
 * Basılı tutunca hızlanarak tekrar eden adım üreteci.
 *
 * `step` her adımda çağrılır; sınıra dayanıldığını `false` döndürerek bildirir ve
 * tekrar kendiliğinden durur — kullanıcının parmağını kaldırması gerekmez.
 */
export function createHoldRepeat(
  step: () => boolean,
  timing: HoldRepeatTiming = defaultHoldRepeatTiming,
  onRepeatStart?: () => void,
): HoldRepeat {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ticks = 0;
  let repeated = false;

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const scheduleNext = () => {
    const wait = ticks >= timing.accelerateAfter ? timing.fastInterval : timing.interval;
    timer = setTimeout(() => {
      ticks += 1;
      if (!step()) {
        clear();
        return;
      }
      scheduleNext();
    }, wait);
  };

  return {
    consumeRepeated() {
      const value = repeated;
      repeated = false;
      return value;
    },
    start() {
      clear();
      ticks = 0;
      repeated = false;
      timer = setTimeout(() => {
        ticks = 1;
        repeated = true;
        onRepeatStart?.();
        if (step()) scheduleNext();
      }, timing.delay);
    },
    stop() {
      clear();
      ticks = 0;
    },
  };
}
