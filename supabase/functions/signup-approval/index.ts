// Orderia — garson kayıt onayı edge function'ı.
//
// İki akış:
// 1) POST (uygulamadan, kullanıcı JWT'si ile): bekleyen başvuruyu bulur,
//    onay/red bağlantılarını SADECE işletme sahibinin e-postasına gönderir
//    (RESEND_API_KEY tanımlıysa Resend ile; değilse function log'una düşer).
// 2) GET (e-postadaki bağlantı, JWT'siz): HMAC imzasını doğrular, başvuruyu
//    onaylar (waiter membership açar) veya reddeder, sonucu HTML sayfası gösterir.
//
// Deploy: verify_jwt KAPALI olmalı (e-posta bağlantısı JWT taşımaz);
// POST akışının güvenliği kod içinde JWT doğrulaması ile sağlanır.
//
// Gerekli secret'lar:
//   OWNER_APPROVAL_EMAIL  — onay e-postasının gideceği TEK adres (işletme sahibi)
//   APPROVAL_SIGNING_SECRET — bağlantı imzalama anahtarı (uzun rastgele metin)
//   RESEND_API_KEY (opsiyonel) — gerçek e-posta gönderimi için; yoksa linkler log'lanır

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface SignupRequestRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  organization_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  notified_at: string | null;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const ownerEmail = (Deno.env.get('OWNER_APPROVAL_EMAIL') ?? '').trim();
  const signingSecret = Deno.env.get('APPROVAL_SIGNING_SECRET') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey || !signingSecret) {
    return new Response(JSON.stringify({ error: 'function_not_configured' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (req.method === 'POST') {
    // Kullanıcı JWT doğrulaması (function verify_jwt kapalı deploy edildiği için burada yapılır)
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ') || !anonKey) {
      return new Response(JSON.stringify({ error: 'authentication_required' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'authentication_required' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { data: request, error: requestError } = await admin
      .from('signup_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle<SignupRequestRow>();
    if (requestError) {
      return new Response(JSON.stringify({ error: requestError.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
    if (!request) {
      return new Response(JSON.stringify({ error: 'no_pending_request' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }
    if (request.notified_at) {
      return new Response(JSON.stringify({ status: 'already_notified' }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const token = await sign(`${request.id}:${request.email}`, signingSecret);
    const baseUrl = `${supabaseUrl}/functions/v1/signup-approval`;
    const approveUrl = `${baseUrl}?action=approve&request=${request.id}&token=${token}`;
    const rejectUrl = `${baseUrl}?action=reject&request=${request.id}&token=${token}`;

    let emailSent = false;
    if (ownerEmail && resendApiKey) {
      emailSent = await sendOwnerEmail(resendApiKey, ownerEmail, request, approveUrl, rejectUrl);
    }
    if (!emailSent) {
      // E-posta altyapısı yoksa bağlantılar function log'una düşer (dashboard'dan kopyalanabilir)
      console.log(
        `Signup approval links for ${request.email} (owner: ${ownerEmail || 'not-configured'}):\nAPPROVE: ${approveUrl}\nREJECT: ${rejectUrl}`,
      );
    }

    await admin
      .from('signup_requests')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', request.id);

    return new Response(JSON.stringify({ status: emailSent ? 'notified' : 'notified_via_log' }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? '';
    const requestId = url.searchParams.get('request') ?? '';
    const token = url.searchParams.get('token') ?? '';

    const { data: request } = await admin
      .from('signup_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle<SignupRequestRow>();
    if (!request) {
      return htmlPage('Başvuru bulunamadı', 'Bu bağlantı geçersiz veya süresi dolmuş.');
    }

    const expectedToken = await sign(`${request.id}:${request.email}`, signingSecret);
    if (token !== expectedToken) {
      return htmlPage('Geçersiz bağlantı', 'İmza doğrulanamadı.');
    }
    if (request.status !== 'pending') {
      return htmlPage(
        'Zaten karara bağlanmış',
        `Bu başvuru daha önce ${request.status === 'approved' ? 'onaylanmış' : 'reddedilmiş'}.`,
      );
    }

    if (action === 'approve') {
      const approval = await approveSignup(admin, request);
      if (!approval.ok) {
        return htmlPage('Onay başarısız', approval.message);
      }
      return htmlPage(
        'Hesap onaylandı',
        `${request.display_name} (${request.email}) artık garson olarak giriş yapabilir.`,
      );
    }
    if (action === 'reject') {
      await admin
        .from('signup_requests')
        .update({ status: 'rejected', decided_at: new Date().toISOString() })
        .eq('id', request.id);
      return htmlPage('Başvuru reddedildi', `${request.email} için hesap açılmadı.`);
    }
    return htmlPage('Geçersiz işlem', 'action parametresi approve veya reject olmalı.');
  }

  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: jsonHeaders,
  });
});

async function approveSignup(
  admin: ReturnType<typeof createClient>,
  request: SignupRequestRow,
): Promise<{ ok: boolean; message: string }> {
  // Organizasyon: başvuruda yoksa tek aktif organizasyonu kullan
  let organizationId = request.organization_id;
  if (!organizationId) {
    const { data: organizations } = await admin
      .from('organizations')
      .select('id')
      .eq('status', 'active')
      .limit(2);
    if (!organizations || organizations.length !== 1) {
      return { ok: false, message: 'Hedef organizasyon belirlenemedi.' };
    }
    organizationId = organizations[0].id as string;
  }

  // Garson için ilk aktif şube
  const { data: branch } = await admin
    .from('branches')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!branch) {
    return { ok: false, message: 'Aktif şube bulunamadı. Önce bir şube oluşturun.' };
  }

  const { data: existing } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', request.user_id)
    .eq('organization_id', organizationId)
    .eq('branch_id', branch.id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    const { error: membershipError } = await admin.from('memberships').insert({
      organization_id: organizationId,
      branch_id: branch.id,
      user_id: request.user_id,
      role: 'waiter',
      status: 'active',
    });
    if (membershipError) {
      return { ok: false, message: `Üyelik açılamadı: ${membershipError.message}` };
    }
  }

  await admin
    .from('signup_requests')
    .update({
      status: 'approved',
      organization_id: organizationId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  return { ok: true, message: 'approved' };
}

async function sendOwnerEmail(
  resendApiKey: string,
  ownerEmail: string,
  request: SignupRequestRow,
  approveUrl: string,
  rejectUrl: string,
): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Orderia <onboarding@resend.dev>',
        to: [ownerEmail],
        subject: `Orderia: Yeni garson başvurusu — ${request.display_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1f2937">Yeni garson başvurusu</h2>
            <p style="color:#374151;font-size:15px">
              <strong>${escapeHtml(request.display_name)}</strong> (${escapeHtml(request.email)})
              Orderia hesabı açmak istiyor.
            </p>
            <p style="margin:28px 0">
              <a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700">
                Onayla
              </a>
              <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-left:12px">
                Reddet
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">
              Bu e-posta yalnızca işletme sahibine gönderilir. Başvuruyu siz onaylamadan hesap aktif olmaz.
            </p>
          </div>`,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Resend send failed', error);
    return false;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function htmlPage(title: string, message: string): Response {
  return new Response(
    `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
  <body style="font-family:Arial,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;max-width:420px;text-align:center">
      <h1 style="color:#1f2937;font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>
      <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0">${escapeHtml(message)}</p>
    </div>
  </body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
