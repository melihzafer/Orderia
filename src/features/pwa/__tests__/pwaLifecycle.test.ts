import {
  applyWaitingPwaUpdate,
  beginPwaCriticalFlow,
  getPwaLifecycleSnapshot,
  requestPwaInstall,
  subscribePwaLifecycle,
} from '../pwaLifecycle';

describe('PWA lifecycle safety', () => {
  it('tracks nested payment-critical flows until every owner releases them', () => {
    const counts: number[] = [];
    const unsubscribe = subscribePwaLifecycle((snapshot) => {
      counts.push(snapshot.criticalFlowCount);
    });
    const releaseFirst = beginPwaCriticalFlow('payment:check-1');
    const releaseSecond = beginPwaCriticalFlow('payment:check-2');

    expect(getPwaLifecycleSnapshot().criticalFlowCount).toBe(2);
    releaseFirst();
    expect(getPwaLifecycleSnapshot().criticalFlowCount).toBe(1);
    releaseFirst();
    expect(getPwaLifecycleSnapshot().criticalFlowCount).toBe(1);
    releaseSecond();
    expect(getPwaLifecycleSnapshot().criticalFlowCount).toBe(0);
    expect(counts).toEqual(expect.arrayContaining([0, 1, 2]));
    unsubscribe();
  });

  it('does not force a reload or install when the browser has no waiting prompt', async () => {
    expect(applyWaitingPwaUpdate()).toBe(false);
    await expect(requestPwaInstall()).resolves.toBe('unavailable');
  });
});
