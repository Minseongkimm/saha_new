/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js';
import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { log, getEnvVar } from '../_shared/config.ts';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface PushRequestBody {
  title?: string;
  message?: string;
  userIds?: string[]; // 지정하면 해당 유저만 대상, 없으면 활성 토큰 전체
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 서비스 계정으로 서명한 JWT를 발급받아 FCM 발송용 OAuth2 액세스 토큰 획득
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new StreamingError('FCM OAuth 토큰 발급 실패', 500, await response.text());
  }

  const data = await response.json();
  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FCM_SERVICE_ACCOUNT_JSON']);

    const serviceAccount: ServiceAccount = JSON.parse(getEnvVar('FCM_SERVICE_ACCOUNT_JSON'));
    const supabase = createClient(getEnvVar('SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

    const body: PushRequestBody = await req.json().catch(() => ({}));
    const title = body.title ?? '사바';
    const message = body.message ?? '오늘의 운세가 도착했어요';

    let query = supabase.from('push_tokens').select('id, device_token').eq('is_active', true);
    if (body.userIds && body.userIds.length > 0) {
      query = query.in('user_id', body.userIds);
    }

    const { data: tokens, error: tokensError } = await query;
    if (tokensError) {
      throw new StreamingError('토큰 조회 실패', 500, tokensError.message);
    }
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, total: 0, deactivated: 0 }),
        { headers: getJsonHeaders() },
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    let sent = 0;
    const invalidTokenIds: string[] = [];

    for (const t of tokens) {
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.device_token,
              notification: { title, body: message },
            },
          }),
        },
      );

      if (fcmResponse.ok) {
        sent++;
      } else {
        const errorText = await fcmResponse.text();
        log('warn', 'FCM 발송 실패', { tokenId: t.id, error: errorText });
        if (errorText.includes('UNREGISTERED') || errorText.includes('NOT_FOUND')) {
          invalidTokenIds.push(t.id);
        }
      }
    }

    if (invalidTokenIds.length > 0) {
      await supabase.from('push_tokens').update({ is_active: false }).in('id', invalidTokenIds);
    }

    return new Response(
      JSON.stringify({ sent, total: tokens.length, deactivated: invalidTokenIds.length }),
      { headers: getJsonHeaders() },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
});
