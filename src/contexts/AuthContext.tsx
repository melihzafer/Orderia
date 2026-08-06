import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import uuid from 'react-native-uuid';
import { captureOperationalError, recordOperationalEvent } from '../observability';
import { AuthGateway, SupabaseAuthGateway } from '../services/supabase/authGateway';
import { getSupabaseClient, subscribeToNativeAuthAutoRefresh } from '../services/supabase/client';
import { DeviceRow, SignupRequestRow } from '../services/supabase/database.types';
import {
  AuthContextValue,
  AuthStatus,
  AuthWorkspace,
  OnboardingRole,
  accessibleBranches,
  membershipForBranch,
} from './authTypes';

const deviceStorageKey = 'orderia.cloud.device_id';
const branchStorageKeyPrefix = 'orderia.cloud.active_branch';
const defaultAppVersion = '2.0.0';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  readonly children: React.ReactNode;
  readonly gateway?: AuthGateway | null;
}

interface GatewayResolution {
  readonly gateway: AuthGateway | null;
  readonly configurationError?: string;
}

export function AuthProvider({ children, gateway: suppliedGateway }: AuthProviderProps) {
  const resolution = useMemo<GatewayResolution>(() => {
    if (suppliedGateway !== undefined) {
      return { gateway: suppliedGateway };
    }

    try {
      const client = getSupabaseClient();
      return {
        gateway: client ? new SupabaseAuthGateway(client) : null,
      };
    } catch {
      return {
        gateway: null,
        configurationError: 'Orderia Cloud is not configured correctly on this build.',
      };
    }
  }, [suppliedGateway]);
  const gateway = resolution.gateway;
  const [status, setStatus] = useState<AuthStatus>(
    resolution.configurationError ? 'error' : gateway ? 'initializing' : 'unconfigured',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<readonly DeviceRow[]>([]);
  const [pendingSignupEmail, setPendingSignupEmail] = useState<string | undefined>();
  const [pendingApprovals, setPendingApprovals] = useState<readonly SignupRequestRow[]>([]);
  const [onboardingRole, setOnboardingRole] = useState<OnboardingRole | null>(null);
  const [createdRestaurantCode, setCreatedRestaurantCode] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    resolution.configurationError,
  );
  const hydrationRevision = useRef(0);

  const activateBranch = useCallback(
    async (targetSession: Session, targetWorkspace: AuthWorkspace, branchId: string) => {
      if (!gateway) return;

      const branch = accessibleBranches(targetWorkspace).find(
        (candidate) => candidate.id === branchId,
      );
      if (!branch) {
        throw new Error('Selected branch is not available to this user');
      }

      const deviceId = await getOrCreateDeviceId();
      await gateway.registerDevice({
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION?.trim() || defaultAppVersion,
        branchId: branch.id,
        deviceId,
        organizationId: branch.organization_id,
        platform: detectDevicePlatform(),
      });
      await AsyncStorage.setItem(branchStorageKey(targetSession.user.id), branch.id);

      setSession(targetSession);
      setWorkspace(targetWorkspace);
      setActiveBranchId(branch.id);
      setCurrentDeviceId(deviceId);
      setDevices([]);
      setOnboardingRole(null);
      setCreatedRestaurantCode(undefined);
      setErrorMessage(undefined);
      setStatus('ready');
      recordOperationalEvent('auth_success', { operation: 'activate_branch' });
    },
    [gateway],
  );

  const restoreSession = useCallback(
    async (targetSession: Session | null) => {
      const revision = hydrationRevision.current + 1;
      hydrationRevision.current = revision;

      if (!gateway) return;
      if (!targetSession) {
        setSession(null);
        setWorkspace(null);
        setActiveBranchId(null);
        setCurrentDeviceId(null);
        setDevices([]);
        setPendingSignupEmail(undefined);
        setOnboardingRole(null);
        setCreatedRestaurantCode(undefined);
        setErrorMessage(undefined);
        setStatus('signed_out');
        return;
      }

      setStatus('initializing');
      setErrorMessage(undefined);

      try {
        const targetWorkspace = await gateway.loadWorkspace(targetSession.user.id);
        if (revision !== hydrationRevision.current) return;

        const branches = accessibleBranches(targetWorkspace);
        if (branches.length === 0) {
          // Üyelik yok: bekleyen onay başvurusu var mı?
          const signupRequest = await gateway.getMySignupRequest();
          if (revision !== hydrationRevision.current) return;
          if (signupRequest?.status === 'pending') {
            setSession(targetSession);
            setWorkspace(targetWorkspace);
            setActiveBranchId(null);
            setOnboardingRole(null);
            setCreatedRestaurantCode(undefined);
            setPendingSignupEmail(signupRequest.email);
            setErrorMessage(undefined);
            setStatus('pending_approval');
            return;
          }
          setSession(targetSession);
          setWorkspace(targetWorkspace);
          setActiveBranchId(null);
          setCurrentDeviceId(null);
          setDevices([]);
          setPendingSignupEmail(undefined);
          setOnboardingRole(null);
          setCreatedRestaurantCode(undefined);
          setErrorMessage(undefined);
          setStatus('onboarding_role');
          return;
        }

        const storedBranchId = await AsyncStorage.getItem(branchStorageKey(targetSession.user.id));
        if (revision !== hydrationRevision.current) return;

        const selectedBranch =
          branches.find((branch) => branch.id === storedBranchId) ??
          (branches.length === 1 ? branches[0] : undefined);
        if (!selectedBranch) {
          setSession(targetSession);
          setWorkspace(targetWorkspace);
          setActiveBranchId(null);
          setStatus('select_branch');
          return;
        }

        await activateBranch(targetSession, targetWorkspace, selectedBranch.id);
      } catch (error) {
        if (revision !== hydrationRevision.current) return;

        if (isDeviceRevocationError(error)) {
          captureOperationalError(error, 'auth_failure', {
            operation: 'restore_revoked_device',
            errorClass: error instanceof Error ? error.name : 'UnknownError',
          });
          await gateway.signOut().catch(() => undefined);
          setSession(null);
          setWorkspace(null);
          setActiveBranchId(null);
          setErrorMessage('This device was revoked by a manager. Sign in on an authorized device.');
          setStatus('signed_out');
          return;
        }

        setSession(targetSession);
        setWorkspace(null);
        setActiveBranchId(null);
        setOnboardingRole(null);
        setCreatedRestaurantCode(undefined);
        setErrorMessage('Your Orderia workspace could not be loaded.');
        setStatus('error');
        captureOperationalError(error, 'auth_failure', {
          operation: 'restore_workspace',
          errorClass: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    },
    [activateBranch, gateway],
  );

  useEffect(() => {
    if (!gateway) return;

    let unsubscribeRefresh: () => void = () => undefined;
    if (suppliedGateway === undefined) {
      const client = getSupabaseClient();
      if (client) {
        unsubscribeRefresh = subscribeToNativeAuthAutoRefresh(client);
      }
    }

    const unsubscribeAuth = gateway.onAuthStateChange((_event, nextSession) => {
      void restoreSession(nextSession);
    });
    void gateway
      .getSession()
      .then(restoreSession)
      .catch((error) => {
        captureOperationalError(error, 'auth_failure', {
          operation: 'restore_session',
          errorClass: error instanceof Error ? error.name : 'UnknownError',
        });
        setErrorMessage('The saved session could not be restored.');
        setStatus('error');
      });

    return () => {
      hydrationRevision.current += 1;
      unsubscribeAuth();
      unsubscribeRefresh();
    };
  }, [gateway, restoreSession, suppliedGateway]);

  const activeBranch = workspace?.branches.find((branch) => branch.id === activeBranchId) ?? null;
  const activeOrganization =
    workspace?.organizations.find(
      (organization) => organization.id === activeBranch?.organization_id,
    ) ?? null;
  const activeMembership =
    workspace && activeBranch ? membershipForBranch(workspace, activeBranch) : null;

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!gateway) {
        throw new Error('Orderia Cloud is not configured');
      }

      setStatus('initializing');
      setErrorMessage(undefined);
      try {
        const nextSession = await gateway.signIn(email.trim(), password);
        await restoreSession(nextSession);
      } catch (error) {
        captureOperationalError(error, 'auth_failure', {
          operation: 'sign_in',
          errorClass: error instanceof Error ? error.name : 'UnknownError',
        });
        setStatus('signed_out');
        setErrorMessage('Email or password is incorrect.');
      }
    },
    [gateway, restoreSession],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!gateway) {
        throw new Error('Orderia Cloud is not configured');
      }

      setStatus('initializing');
      setErrorMessage(undefined);
      try {
        const nextSession = await gateway.signUp(email.trim(), password, displayName.trim());
        setSession(nextSession);
        setWorkspace(null);
        setActiveBranchId(null);
        setCurrentDeviceId(null);
        setDevices([]);
        setPendingSignupEmail(undefined);
        setOnboardingRole(null);
        setCreatedRestaurantCode(undefined);
        setStatus('onboarding_role');
        recordOperationalEvent('auth_success', { operation: 'sign_up' });
      } catch (error) {
        captureOperationalError(error, 'auth_failure', {
          operation: 'sign_up',
          errorClass: error instanceof Error ? error.name : 'UnknownError',
        });
        setStatus('signed_out');
        if (error instanceof Error && error.message === 'email_confirmation_must_be_disabled') {
          setErrorMessage(
            'This Supabase project still sends confirmation emails to users. Disable "Confirm email" in Supabase Auth settings so only the owner receives approval emails.',
          );
        } else {
          setErrorMessage('Registration failed. The email may already be in use.');
        }
        throw error;
      }
    },
    [gateway],
  );

  const selectOnboardingRole = useCallback((role: OnboardingRole) => {
    setOnboardingRole(role);
    setCreatedRestaurantCode(undefined);
    setErrorMessage(undefined);
    setStatus('onboarding_restaurant');
  }, []);

  const resetOnboardingRole = useCallback(() => {
    setOnboardingRole(null);
    setCreatedRestaurantCode(undefined);
    setErrorMessage(undefined);
    setStatus('onboarding_role');
  }, []);

  const joinRestaurant = useCallback(
    async (code: string) => {
      if (!gateway || !session || !onboardingRole) {
        throw new Error('Restaurant onboarding is not ready');
      }

      setStatus('initializing');
      setErrorMessage(undefined);
      try {
        await gateway.joinRestaurant(code, onboardingRole);
        await restoreSession(session);
      } catch (error) {
        setStatus('onboarding_restaurant');
        setErrorMessage(onboardingErrorMessage(error));
        throw error;
      }
    },
    [gateway, onboardingRole, restoreSession, session],
  );

  const createRestaurant = useCallback(
    async (name: string, branchName?: string) => {
      if (!gateway || !session || onboardingRole !== 'manager') {
        throw new Error('Manager onboarding is not ready');
      }

      setStatus('initializing');
      setErrorMessage(undefined);
      try {
        const result = await gateway.createRestaurant(name, branchName);
        setCreatedRestaurantCode(result.restaurantCode);
        setStatus('onboarding_restaurant');
      } catch (error) {
        setStatus('onboarding_restaurant');
        setErrorMessage(onboardingErrorMessage(error));
        throw error;
      }
    },
    [gateway, onboardingRole, session],
  );

  const finishOnboarding = useCallback(async () => {
    if (!session) throw new Error('An authenticated session is required');
    setCreatedRestaurantCode(undefined);
    await restoreSession(session);
  }, [restoreSession, session]);

  const signOut = useCallback(async () => {
    if (!gateway) return;
    hydrationRevision.current += 1;
    await gateway.signOut();
    setSession(null);
    setWorkspace(null);
    setActiveBranchId(null);
    setCurrentDeviceId(null);
    setDevices([]);
    setPendingSignupEmail(undefined);
    setOnboardingRole(null);
    setCreatedRestaurantCode(undefined);
    setErrorMessage(undefined);
    setStatus('signed_out');
  }, [gateway]);

  const retry = useCallback(async () => {
    if (!gateway) return;
    await restoreSession(await gateway.getSession());
  }, [gateway, restoreSession]);

  const switchBranch = useCallback(
    async (branchId: string) => {
      if (!session || !workspace) {
        throw new Error('An authenticated workspace is required');
      }

      setStatus('initializing');
      try {
        await activateBranch(session, workspace, branchId);
      } catch (error) {
        if (isDeviceRevocationError(error)) {
          await signOut();
          setErrorMessage('This device was revoked by a manager. Sign in on an authorized device.');
          return;
        }

        setErrorMessage('The selected branch could not be activated.');
        setStatus(activeBranchId ? 'ready' : 'select_branch');
      }
    },
    [activateBranch, activeBranchId, session, signOut, workspace],
  );

  useEffect(() => {
    if (!gateway || status !== 'ready' || !currentDeviceId) return;

    const verifyDevice = async () => {
      try {
        await gateway.touchDevice(currentDeviceId);
      } catch (error) {
        if (!isDeviceRevocationError(error)) return;

        await signOut().catch(() => undefined);
        setErrorMessage('This device was revoked by a manager. Sign in on an authorized device.');
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          void verifyDevice();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void verifyDevice();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [currentDeviceId, gateway, signOut, status]);

  const refreshDevices = useCallback(async () => {
    if (!gateway || !activeBranch || activeMembership?.role !== 'manager') {
      setDevices([]);
      return;
    }

    try {
      setDevices(
        await gateway.listDevices(
          activeBranch.organization_id,
          activeMembership.branch_id === null ? undefined : activeBranch.id,
        ),
      );
    } catch {
      setErrorMessage('The device list could not be refreshed.');
    }
  }, [activeBranch, activeMembership, gateway]);

  const revokeDevice = useCallback(
    async (deviceId: string) => {
      if (!gateway || activeMembership?.role !== 'manager') {
        throw new Error('Manager access is required to revoke devices');
      }

      await gateway.revokeDevice(deviceId);
      if (deviceId === currentDeviceId) {
        await signOut();
        return;
      }
      await refreshDevices();
    },
    [activeMembership, currentDeviceId, gateway, refreshDevices, signOut],
  );

  const refreshApprovals = useCallback(async () => {
    if (!gateway || activeMembership?.role !== 'manager') {
      setPendingApprovals([]);
      return;
    }
    try {
      setPendingApprovals(await gateway.listPendingSignupRequests());
    } catch {
      setPendingApprovals([]);
    }
  }, [activeMembership, gateway]);

  const approveSignup = useCallback(
    async (signupId: string) => {
      if (!gateway || activeMembership?.role !== 'manager') {
        throw new Error('Manager access is required to approve signups');
      }
      await gateway.approveSignupRequest(signupId);
      await refreshApprovals();
    },
    [activeMembership, gateway, refreshApprovals],
  );

  const rejectSignup = useCallback(
    async (signupId: string) => {
      if (!gateway || activeMembership?.role !== 'manager') {
        throw new Error('Manager access is required to reject signups');
      }
      await gateway.rejectSignupRequest(signupId);
      await refreshApprovals();
    },
    [activeMembership, gateway, refreshApprovals],
  );

  const value: AuthContextValue = {
    status,
    cloudEnabled: gateway !== null,
    session,
    workspace,
    activeBranch,
    activeOrganization,
    activeMembership,
    onboardingRole,
    createdRestaurantCode,
    currentDeviceId,
    devices,
    errorMessage,
    pendingSignupEmail,
    pendingApprovals,
    signIn,
    signUp,
    selectOnboardingRole,
    resetOnboardingRole,
    joinRestaurant,
    createRestaurant,
    finishOnboarding,
    signOut,
    refreshApprovals,
    approveSignup,
    rejectSignup,
    retry,
    switchBranch,
    refreshDevices,
    revokeDevice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function branchStorageKey(userId: string): string {
  return `${branchStorageKeyPrefix}.${userId}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(deviceStorageKey);
  if (existing) return existing;

  const created = String(uuid.v4());
  await AsyncStorage.setItem(deviceStorageKey, created);
  return created;
}

function detectDevicePlatform(): DeviceRow['platform'] {
  if (Platform.OS === 'android') return 'android';
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  ) {
    return 'ios_web';
  }
  return 'web';
}

function isDeviceRevocationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('device_revoked') || error.message.includes('device_unavailable'))
  );
}

function onboardingErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('restaurant_not_found') || message.includes('invalid_restaurant_code')) {
    return 'That restaurant code is invalid or no longer active.';
  }
  if (message.includes('already_member')) {
    return 'This account is already connected to a restaurant.';
  }
  if (message.includes('invalid_restaurant_name')) {
    return 'Enter a restaurant name between 1 and 120 characters.';
  }
  if (message.includes('invalid_branch_name')) {
    return 'Enter a valid branch name.';
  }
  return 'Restaurant setup could not be completed. Check your connection and try again.';
}
