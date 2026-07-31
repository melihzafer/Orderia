import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setTelemetryIdentity } from './telemetry';

export function TelemetryIdentityBridge(): null {
  const auth = useAuth();

  useEffect(() => {
    setTelemetryIdentity({
      organizationId: auth.activeBranch?.organization_id,
      branchId: auth.activeBranch?.id,
      userId: auth.session?.user.id,
      deviceId: auth.currentDeviceId ?? undefined,
    });
  }, [
    auth.activeBranch?.id,
    auth.activeBranch?.organization_id,
    auth.currentDeviceId,
    auth.session?.user.id,
  ]);

  return null;
}
