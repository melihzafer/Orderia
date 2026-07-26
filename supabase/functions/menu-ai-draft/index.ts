const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonRecord = Record<string, unknown>;

Deno.serve(async (request) => {
  const startedAt = Date.now();
  const origin = request.headers.get('origin');
  const originHeader = allowedOrigin(origin);
  const responseHeaders = { ...corsHeaders, 'Access-Control-Allow-Origin': originHeader };

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ code: 'method_not_allowed' }, 405, responseHeaders);
  }
  if (origin && originHeader === 'null') {
    return jsonResponse({ code: 'origin_not_allowed' }, 403, responseHeaders);
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ code: 'authentication_required' }, 401, responseHeaders);
  }

  let requestId: string | undefined;
  let scope: { organizationId: string; branchId: string } | undefined;
  try {
    const body = await request.json();
    const input = parseInput(body);
    scope = input;
    const model = Deno.env.get('OPENAI_MENU_MODEL')?.trim() || 'gpt-5.6-luna';

    const reservation = await rpc(
      'reserve_menu_ai_request',
      {
        requested_organization_id: input.organizationId,
        requested_branch_id: input.branchId,
        requested_client_request_id: input.clientRequestId,
        requested_input_text: input.input,
        requested_model: model,
      },
      authorization,
    );
    requestId = requiredString(reservation.id, 'invalid_reservation');

    if (reservation.replayed === true && reservation.status !== 'processing') {
      const existing = await restSelect(
        `menu_ai_requests?id=eq.${encodeURIComponent(requestId)}&select=id,status,version,suggestion_json,error_code`,
        authorization,
      );
      const row = Array.isArray(existing) ? existing[0] : undefined;
      if (isRecord(row)) {
        return jsonResponse(
          {
            id: row.id,
            status: row.status,
            version: row.version,
            suggestion: row.suggestion_json,
            replayed: true,
          },
          200,
          responseHeaders,
        );
      }
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
    if (!openAiKey) throw new PublicError('ai_unconfigured', 503);

    const [categories, menuItems, allergens] = await Promise.all([
      restSelect(
        `menu_categories?organization_id=eq.${input.organizationId}&or=(branch_id.is.null,branch_id.eq.${input.branchId})&deleted_at=is.null&select=id,name&order=sort_order`,
        authorization,
      ),
      restSelect(
        `menu_items?organization_id=eq.${input.organizationId}&or=(branch_id.is.null,branch_id.eq.${input.branchId})&deleted_at=is.null&select=id,name,price_minor,category_id&limit=200`,
        authorization,
      ),
      restSelect('allergens?select=code,name&order=code', authorization),
    ]);

    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 1800,
        safety_identifier: await safetyIdentifier(authorization),
        input: [
          {
            role: 'system',
            content: menuAssistantPrompt(input.currencyCode, input.locale),
          },
          {
            role: 'user',
            content: JSON.stringify({
              request: input.input,
              currencyCode: input.currencyCode,
              existingCategories: categories,
              existingItems: menuItems,
              allowedAllergens: allergens,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'orderia_menu_item_draft',
            strict: true,
            schema: menuDraftSchema(input.currencyCode),
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const responseJson = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error('menu-ai-draft OpenAI error', {
        requestId,
        status: apiResponse.status,
        type: isRecord(responseJson.error) ? responseJson.error.type : undefined,
      });
      throw new PublicError(
        apiResponse.status === 429 ? 'ai_rate_limited' : 'ai_generation_failed',
        apiResponse.status === 429 ? 429 : 502,
      );
    }

    const suggestion = JSON.parse(extractOutputText(responseJson));
    assertSuggestion(suggestion, input.currencyCode);
    const usage = isRecord(responseJson.usage) ? responseJson.usage : {};
    const completed = await rpc(
      'complete_menu_ai_request',
      {
        requested_organization_id: input.organizationId,
        requested_branch_id: input.branchId,
        requested_request_id: requestId,
        requested_suggestion: suggestion,
        requested_model: model,
        requested_input_tokens: integerOrZero(usage.input_tokens),
        requested_output_tokens: integerOrZero(usage.output_tokens),
        requested_latency_ms: Date.now() - startedAt,
      },
      authorization,
    );

    return jsonResponse(
      {
        id: completed.id,
        status: completed.status,
        version: completed.version,
        suggestion: completed.suggestion,
        replayed: false,
      },
      200,
      responseHeaders,
    );
  } catch (error) {
    const publicError =
      error instanceof PublicError ? error : new PublicError('menu_ai_unavailable', 502);
    console.error('menu-ai-draft failed', {
      code: publicError.code,
      requestId,
      message: error instanceof Error ? error.message : 'unknown',
    });
    if (requestId && scope) {
      try {
        await rpc(
          'fail_menu_ai_request',
          {
            requested_organization_id: scope.organizationId,
            requested_branch_id: scope.branchId,
            requested_request_id: requestId,
            requested_error_code: publicError.code,
            requested_latency_ms: Date.now() - startedAt,
          },
          authorization,
        );
      } catch (failureAuditError) {
        console.error('menu-ai-draft audit failure', {
          requestId,
          message: failureAuditError instanceof Error ? failureAuditError.message : 'unknown',
        });
      }
    }
    return jsonResponse({ code: publicError.code }, publicError.status, responseHeaders);
  }
});

function parseInput(value: unknown) {
  if (!isRecord(value)) throw new PublicError('invalid_request', 400);
  const organizationId = requiredUuid(value.organizationId);
  const branchId = requiredUuid(value.branchId);
  const clientRequestId = requiredUuid(value.clientRequestId);
  const input = requiredString(value.input, 'invalid_request').trim();
  const currencyCode = requiredString(value.currencyCode, 'invalid_request');
  const locale = requiredString(value.locale, 'invalid_request');
  if (
    input.length < 3 ||
    input.length > 500 ||
    !/^[A-Z]{3}$/.test(currencyCode) ||
    !['tr', 'bg', 'en'].includes(locale)
  ) {
    throw new PublicError('invalid_request', 400);
  }
  return { organizationId, branchId, clientRequestId, input, currencyCode, locale };
}

function menuAssistantPrompt(currencyCode: string, locale: string): string {
  return [
    'You create one editable restaurant menu-item draft for Orderia.',
    `The branch currency is ${currencyCode}; return integer minor units only.`,
    `Write the primary item in the input language and translations for tr, bg, and en.`,
    `Prefer the existing category names. The manager UI locale is ${locale}.`,
    'Suggest practical modifier groups only when they make service faster.',
    'Never state or infer an allergen as fact.',
    'Every allergen suggestion must have status "unknown" and tell the manager to verify recipe or supplier data.',
    'Do not publish, mutate data, or invent a currency conversion.',
    'If information is ambiguous, choose an editable draft and add a short warning.',
    'Do not include any keys outside the supplied schema.',
  ].join(' ');
}

function menuDraftSchema(currencyCode: string): JsonRecord {
  const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  const nullableInteger = { anyOf: [{ type: 'integer' }, { type: 'null' }] };
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion',
      'item',
      'translations',
      'modifierGroups',
      'allergenSuggestions',
      'warnings',
    ],
    properties: {
      schemaVersion: { type: 'integer', const: 1 },
      item: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'description',
          'priceMinor',
          'currencyCode',
          'categoryName',
          'prepTimeMinutes',
        ],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 160 },
          description: nullableString,
          priceMinor: { type: 'integer', minimum: 0, maximum: 999999999 },
          currencyCode: { type: 'string', const: currencyCode },
          categoryName: { type: 'string', minLength: 1, maxLength: 120 },
          prepTimeMinutes: {
            ...nullableInteger,
            minimum: 0,
            maximum: 1440,
          },
        },
      },
      translations: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['locale', 'name', 'description'],
          properties: {
            locale: { type: 'string', enum: ['tr', 'bg', 'en'] },
            name: { type: 'string', minLength: 1, maxLength: 160 },
            description: nullableString,
          },
        },
      },
      modifierGroups: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'name',
            'selectionType',
            'minimumChoices',
            'maximumChoices',
            'isRequired',
            'sortOrder',
            'options',
          ],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            selectionType: { type: 'string', enum: ['single', 'multiple'] },
            minimumChoices: { type: 'integer', minimum: 0, maximum: 20 },
            maximumChoices: {
              anyOf: [{ type: 'integer', minimum: 1, maximum: 20 }, { type: 'null' }],
            },
            isRequired: { type: 'boolean' },
            sortOrder: { type: 'integer', minimum: 0, maximum: 100 },
            options: {
              type: 'array',
              maxItems: 20,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'priceDeltaMinor', 'isDefault', 'sortOrder'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 120 },
                  priceDeltaMinor: {
                    type: 'integer',
                    minimum: -999999999,
                    maximum: 999999999,
                  },
                  isDefault: { type: 'boolean' },
                  sortOrder: { type: 'integer', minimum: 0, maximum: 100 },
                },
              },
            },
          },
        },
      },
      allergenSuggestions: {
        type: 'array',
        maxItems: 14,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'status', 'reason'],
          properties: {
            code: { type: 'string', pattern: '^[A-Z0-9_]{1,32}$' },
            status: { type: 'string', const: 'unknown' },
            reason: { type: 'string', minLength: 1, maxLength: 240 },
          },
        },
      },
      warnings: {
        type: 'array',
        maxItems: 10,
        items: { type: 'string', minLength: 1, maxLength: 240 },
      },
    },
  };
}

async function rpc(name: string, body: JsonRecord, authorization: string) {
  return apiFetch(`/rest/v1/rpc/${name}`, authorization, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function restSelect(path: string, authorization: string) {
  return apiFetch(`/rest/v1/${path}`, authorization, { method: 'GET' });
}

async function apiFetch(path: string, authorization: string, init: RequestInit) {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      authorization,
      'Content-Type': 'application/json',
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const code =
      isRecord(body) && typeof body.message === 'string' ? body.message : 'database_error';
    throw new PublicError(code, response.status >= 500 ? 502 : response.status);
  }
  return body;
}

async function safetyIdentifier(authorization: string): Promise<string> {
  const token = authorization.slice('Bearer '.length);
  const subject = decodeJwtSubject(token);
  const bytes = new TextEncoder().encode(`orderia-menu:${subject}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `ord_${Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)}`;
}

function decodeJwtSubject(token: string): string {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(normalized));
    return requiredString(parsed.sub, 'invalid_token');
  } catch {
    throw new PublicError('invalid_token', 401);
  }
}

function extractOutputText(response: unknown): string {
  if (!isRecord(response)) throw new Error('invalid_openai_response');
  if (typeof response.output_text === 'string') return response.output_text;
  if (!Array.isArray(response.output)) throw new Error('missing_openai_output');
  for (const output of response.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  throw new Error('missing_openai_output_text');
}

function assertSuggestion(value: unknown, currencyCode: string): asserts value is JsonRecord {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.item) ||
    value.item.currencyCode !== currencyCode ||
    !Number.isInteger(value.item.priceMinor) ||
    !Array.isArray(value.translations) ||
    !Array.isArray(value.modifierGroups) ||
    !Array.isArray(value.allergenSuggestions) ||
    !value.allergenSuggestions.every((entry) => isRecord(entry) && entry.status === 'unknown') ||
    !Array.isArray(value.warnings)
  ) {
    throw new Error('invalid_structured_suggestion');
  }
}

function allowedOrigin(origin: string | null): string {
  if (!origin) return '*';
  const configured = (Deno.env.get('ORDERIA_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;
  if (configured.length === 0 && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return 'null';
}

function jsonResponse(body: JsonRecord, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function requiredString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new PublicError(code, 400);
  return value;
}

function requiredUuid(value: unknown): string {
  const text = requiredString(value, 'invalid_request');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new PublicError('invalid_request', 400);
  }
  return text;
}

function integerOrZero(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class PublicError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
