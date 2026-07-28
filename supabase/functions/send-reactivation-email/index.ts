/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'npm:nodemailer@6.9.9';
import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateEnvVars, StreamingError } from '../_shared/error-handler.ts';
import { log, getEnvVar } from '../_shared/config.ts';

interface EmailRequestBody {
  subject: string;
  html: string;
  text?: string;
  // 지정하면 이 주소로만 발송 (실제 캠페인 전 테스트용)
  testEmail?: string;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

// 탈퇴하지 않은 유저의 이메일 전체를 페이지네이션으로 수집
async function collectActiveUserEmails(
  supabase: ReturnType<typeof createClient>,
): Promise<{ id: string; email: string }[]> {
  const result: { id: string; email: string }[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new StreamingError('유저 목록 조회 실패', 500, error.message);
    }

    const users = (data?.users ?? []) as AuthUser[];
    for (const u of users) {
      const isDeleted = Boolean(u.user_metadata?.is_deleted);
      if (!isDeleted && u.email) {
        result.push({ id: u.id, email: u.email });
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GMAIL_USER', 'GMAIL_APP_PASSWORD']);

    const supabase = createClient(getEnvVar('SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

    const body: EmailRequestBody = await req.json().catch(() => ({} as EmailRequestBody));
    if (!body.subject || !body.html) {
      throw new StreamingError('subject, html은 필수입니다', 400);
    }

    const gmailUser = getEnvVar('GMAIL_USER');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: getEnvVar('GMAIL_APP_PASSWORD'),
      },
    });

    const recipients = body.testEmail
      ? [{ id: 'test', email: body.testEmail }]
      : await collectActiveUserEmails(supabase);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0 }), { headers: getJsonHeaders() });
    }

    let sent = 0;
    const failed: { email: string; error: string }[] = [];

    for (const r of recipients) {
      try {
        await transporter.sendMail({
          from: `사바 <${gmailUser}>`,
          to: r.email,
          subject: body.subject,
          html: body.html,
          text: body.text,
        });
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log('warn', '이메일 발송 실패', { email: r.email, error: message });
        failed.push({ email: r.email, error: message });
      }
    }

    return new Response(
      JSON.stringify({ sent, failed: failed.length, total: recipients.length, failedDetails: failed }),
      { headers: getJsonHeaders() },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
});
