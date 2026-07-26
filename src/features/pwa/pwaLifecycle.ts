import { Platform } from 'react-native';

interface DeferredInstallPrompt extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  readonly standalone?: boolean;
}

export type PwaStorageState = 'unsupported' | 'checking' | 'best_effort' | 'persistent';

export interface PwaLifecycleSnapshot {
  readonly supported: boolean;
  readonly installed: boolean;
  readonly installAvailable: boolean;
  readonly iosInstallGuidance: boolean;
  readonly updateReady: boolean;
  readonly storage: PwaStorageState;
  readonly criticalFlowCount: number;
}

type Listener = (snapshot: PwaLifecycleSnapshot) => void;

const listeners = new Set<Listener>();
const criticalFlows = new Set<string>();
let deferredInstallPrompt: DeferredInstallPrompt | undefined;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let initialized = false;
let lifecycleReferenceCount = 0;
let lifecycleCleanup: (() => void) | undefined;
let reloadRequested = false;

let snapshot: PwaLifecycleSnapshot = {
  supported: false,
  installed: false,
  installAvailable: false,
  iosInstallGuidance: false,
  updateReady: false,
  storage: 'unsupported',
  criticalFlowCount: 0,
};

export function initializePwaLifecycle(): () => void {
  if (!isBrowser()) return () => undefined;
  lifecycleReferenceCount += 1;
  if (initialized) return releaseLifecycleReference();
  initialized = true;

  const installed = isStandalone();
  const iosInstallGuidance = isIosSafari() && !installed;
  updateSnapshot({
    supported: 'serviceWorker' in navigator,
    installed,
    iosInstallGuidance,
    storage:
      typeof (navigator as Partial<Navigator>).storage?.persisted === 'function'
        ? 'checking'
        : 'unsupported',
  });

  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as DeferredInstallPrompt;
    updateSnapshot({ installAvailable: true });
  };
  const onInstalled = () => {
    deferredInstallPrompt = undefined;
    updateSnapshot({
      installed: true,
      installAvailable: false,
      iosInstallGuidance: false,
    });
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void serviceWorkerRegistration?.update();
      void inspectStoragePersistence();
    }
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onInstalled);
  document.addEventListener('visibilitychange', onVisibilityChange);
  void inspectStoragePersistence();
  void registerServiceWorker();

  lifecycleCleanup = () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', onInstalled);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    initialized = false;
  };
  return releaseLifecycleReference();
}

export function subscribePwaLifecycle(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function getPwaLifecycleSnapshot(): PwaLifecycleSnapshot {
  return snapshot;
}

export async function requestPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) return 'unavailable';
  const prompt = deferredInstallPrompt;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') {
    deferredInstallPrompt = undefined;
    updateSnapshot({ installAvailable: false });
  }
  return choice.outcome;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!isBrowser() || !navigator.storage?.persist) return false;
  const persistent = await navigator.storage.persist();
  updateSnapshot({ storage: persistent ? 'persistent' : 'best_effort' });
  return persistent;
}

export function applyWaitingPwaUpdate(): boolean {
  if (!serviceWorkerRegistration?.waiting || snapshot.criticalFlowCount > 0 || reloadRequested) {
    return false;
  }
  reloadRequested = true;
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      window.location.reload();
    },
    { once: true },
  );
  serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function beginPwaCriticalFlow(flowId: string): () => void {
  if (!flowId) throw new Error('Critical flow ID is required');
  criticalFlows.add(flowId);
  updateSnapshot({ criticalFlowCount: criticalFlows.size });
  return () => {
    criticalFlows.delete(flowId);
    updateSnapshot({ criticalFlowCount: criticalFlows.size });
  };
}

async function registerServiceWorker(): Promise<void> {
  if (
    !isBrowser() ||
    process.env.NODE_ENV !== 'production' ||
    !window.isSecureContext ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    serviceWorkerRegistration = registration;
    observeRegistration(registration);
    if (registration.waiting) updateSnapshot({ updateReady: true });
    await registration.update();
  } catch (error) {
    console.warn('Orderia service worker registration failed', error);
  }
}

function observeRegistration(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        updateSnapshot({ updateReady: true });
      }
    });
  });
}

async function inspectStoragePersistence(): Promise<void> {
  if (!isBrowser() || !navigator.storage?.persisted) return;
  try {
    updateSnapshot({
      storage: (await navigator.storage.persisted()) ? 'persistent' : 'best_effort',
    });
  } catch {
    updateSnapshot({ storage: 'best_effort' });
  }
}

function updateSnapshot(patch: Partial<PwaLifecycleSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener(snapshot));
}

function isStandalone(): boolean {
  if (!isBrowser()) return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  );
}

function isIosSafari(): boolean {
  if (!isBrowser()) return false;
  const userAgent = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(userAgent);
  const webkit = /WebKit/.test(userAgent);
  const otherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return ios && webkit && !otherIosBrowser;
}

function isBrowser(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function releaseLifecycleReference(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lifecycleReferenceCount = Math.max(0, lifecycleReferenceCount - 1);
    if (lifecycleReferenceCount === 0) {
      lifecycleCleanup?.();
      lifecycleCleanup = undefined;
    }
  };
}
