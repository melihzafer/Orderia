import { createHoldRepeat, defaultHoldRepeatTiming } from '../holdRepeat';

const timing = { accelerateAfter: 3, delay: 400, fastInterval: 50, interval: 100 };

describe('createHoldRepeat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does nothing until the finger has been held past the delay', () => {
    const step = jest.fn(() => true);
    const repeater = createHoldRepeat(step, timing);

    repeater.start();
    jest.advanceTimersByTime(timing.delay - 1);

    expect(step).not.toHaveBeenCalled();
  });

  it('keeps stepping while the finger stays down, so eight beers are not eight taps', () => {
    const step = jest.fn(() => true);
    // Hızlanmayı devre dışı bırakıp sayımı doğrusal tutuyoruz; ivme ayrı testte.
    const repeater = createHoldRepeat(step, {
      ...timing,
      accelerateAfter: Number.MAX_SAFE_INTEGER,
    });

    repeater.start();
    jest.advanceTimersByTime(timing.delay);
    expect(step).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(timing.interval * 3);
    expect(step).toHaveBeenCalledTimes(4);
  });

  it('speeds up once the hold is clearly deliberate', () => {
    const step = jest.fn(() => true);
    const repeater = createHoldRepeat(step, timing);

    repeater.start();
    jest.advanceTimersByTime(timing.delay);
    jest.advanceTimersByTime(timing.interval * timing.accelerateAfter);
    const beforeAcceleration = step.mock.calls.length;

    // Hızlanmış aralıkta aynı süre, daha çok adım üretmeli.
    jest.advanceTimersByTime(timing.interval);
    expect(step.mock.calls.length - beforeAcceleration).toBeGreaterThan(1);
  });

  it('stops on its own when the value hits its limit, without waiting for the finger', () => {
    let remaining = 2;
    const step = jest.fn(() => {
      remaining -= 1;
      return remaining > 0;
    });
    const repeater = createHoldRepeat(step, timing);

    repeater.start();
    jest.advanceTimersByTime(timing.delay + timing.interval * 20);

    expect(step).toHaveBeenCalledTimes(2);
  });

  it('reports the repeat so releasing the finger does not add an extra step', () => {
    const repeater = createHoldRepeat(() => true, timing);

    repeater.start();
    jest.advanceTimersByTime(timing.delay);
    repeater.stop();

    // onPressOut -> stop(), sonra onPress -> consumeRepeated(): fazladan adım yok.
    expect(repeater.consumeRepeated()).toBe(true);
    // Bayrak tek kullanımlık; sonraki tek dokunuş normal işlemeli.
    expect(repeater.consumeRepeated()).toBe(false);
  });

  it('treats a quick tap as no repeat at all', () => {
    const step = jest.fn(() => true);
    const repeater = createHoldRepeat(step, timing);

    repeater.start();
    jest.advanceTimersByTime(80);
    repeater.stop();

    expect(step).not.toHaveBeenCalled();
    expect(repeater.consumeRepeated()).toBe(false);
  });

  it('cancels a pending repeat when stopped, so an unmount leaves no timer running', () => {
    const step = jest.fn(() => true);
    const repeater = createHoldRepeat(step, timing);

    repeater.start();
    repeater.stop();
    jest.advanceTimersByTime(timing.delay + timing.interval * 10);

    expect(step).not.toHaveBeenCalled();
  });

  it('ships a delay long enough not to fire during an ordinary tap', () => {
    expect(defaultHoldRepeatTiming.delay).toBeGreaterThanOrEqual(300);
    expect(defaultHoldRepeatTiming.fastInterval).toBeLessThan(defaultHoldRepeatTiming.interval);
  });
});
