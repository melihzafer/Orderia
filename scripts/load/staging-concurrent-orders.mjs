import { randomUUID } from 'node:crypto';

if (process.env.ORDERIA_LOAD_TEST_CONFIRM !== 'staging') {
  console.error('Refusing to mutate data. Set ORDERIA_LOAD_TEST_CONFIRM=staging explicitly.');
  process.exit(1);
}

const config = {
  url: required('ORDERIA_LOAD_SUPABASE_URL').replace(/\/$/, ''),
  key: required('ORDERIA_LOAD_SUPABASE_ANON_KEY'),
  email: required('ORDERIA_LOAD_EMAIL'),
  password: required('ORDERIA_LOAD_PASSWORD'),
  organizationId: required('ORDERIA_LOAD_ORGANIZATION_ID'),
  branchId: required('ORDERIA_LOAD_BRANCH_ID'),
  tableId: required('ORDERIA_LOAD_TABLE_ID'),
  menuItemId: required('ORDERIA_LOAD_MENU_ITEM_ID'),
  menuItemVersion: Number(process.env.ORDERIA_LOAD_MENU_ITEM_VERSION ?? 1),
  deviceCount: Number(process.env.ORDERIA_LOAD_DEVICE_COUNT ?? 100),
};
if (!config.url.startsWith('https://')) throw new Error('Staging URL must use HTTPS.');
if (
  !Number.isSafeInteger(config.deviceCount) ||
  config.deviceCount < 2 ||
  config.deviceCount > 200
) {
  throw new Error('Device count must be between 2 and 200.');
}

const token = await signIn();
const devices = Array.from({ length: config.deviceCount }, () => randomUUID());
await pooled(devices, 20, (deviceId) =>
  rpc('register_device', {
    device_id: deviceId,
    requested_organization_id: config.organizationId,
    requested_branch_id: config.branchId,
    device_platform: 'android',
    client_app_version: 'load-test',
    device_push_endpoint: null,
  }),
);

const startedAt = Date.now();
const requests = devices.map((deviceId) => {
  const now = new Date().toISOString();
  const sessionId = randomUUID();
  const checkId = randomUUID();
  const batchId = randomUUID();
  const mutationId = randomUUID();
  const payload = {
    tableId: config.tableId,
    session: { id: sessionId, openedAt: now },
    check: { id: checkId, name: 'LOAD TEST', openedAt: now },
    batch: { id: batchId, createdAt: now },
    items: [
      {
        id: randomUUID(),
        menuItemId: config.menuItemId,
        menuItemVersion: config.menuItemVersion,
        quantity: 1,
        note: null,
        modifierSelections: [],
      },
    ],
  };
  return { deviceId, mutationId, batchId, payload };
});

const results = await Promise.all(
  requests.map(async (request) => {
    const requestStartedAt = Date.now();
    const result = await rpc('apply_concurrent_order_batch', {
      requested_organization_id: config.organizationId,
      requested_branch_id: config.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.mutationId,
      requested_entity_id: request.batchId,
      requested_payload: request.payload,
    });
    return { result, latencyMs: Date.now() - requestStartedAt };
  }),
);

const replayResults = await Promise.all(
  requests.slice(0, 10).map((request) =>
    rpc('apply_concurrent_order_batch', {
      requested_organization_id: config.organizationId,
      requested_branch_id: config.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.mutationId,
      requested_entity_id: request.batchId,
      requested_payload: request.payload,
    }),
  ),
);

const canonicalSessions = new Set(results.map(({ result }) => result.canonicalSessionId));
const canonicalChecks = new Set(results.map(({ result }) => result.canonicalCheckId));
const latencies = results.map(({ latencyMs }) => latencyMs).sort((left, right) => left - right);
const summary = {
  devices: config.deviceCount,
  successfulBatches: results.filter(({ result }) => result.status === 'applied').length,
  idempotentReplays: replayResults.filter((result) => result.status === 'applied').length,
  canonicalSessionCount: canonicalSessions.size,
  canonicalCheckCount: canonicalChecks.size,
  elapsedMs: Date.now() - startedAt,
  p50Ms: percentile(latencies, 0.5),
  p95Ms: percentile(latencies, 0.95),
  p99Ms: percentile(latencies, 0.99),
};
console.log(JSON.stringify(summary, null, 2));
if (
  summary.successfulBatches !== config.deviceCount ||
  summary.idempotentReplays !== 10 ||
  summary.canonicalSessionCount !== 1 ||
  summary.canonicalCheckCount !== 1
) {
  process.exit(1);
}

async function signIn() {
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.email, password: config.password }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`Sign-in failed: ${body.message}`);
  return body.access_token;
}

async function rpc(name, body) {
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${name} failed: ${JSON.stringify(result)}`);
  return result;
}

async function pooled(values, concurrency, action) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (next < values.length) {
        const index = next++;
        await action(values[index]);
      }
    }),
  );
}

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
