/// <reference lib="deno.ns" />

// @deno-types="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCorsPreFlight, getJsonHeaders } from '../_shared/cors.ts';
import { createErrorResponse, validateEnvVars } from '../_shared/error-handler.ts';
import { getEnvVar, log } from '../_shared/config.ts';

type SupabaseServiceClient = ReturnType<typeof createClient>;

/**
 * 대상 테이블에서 특정 사용자의 데이터를 삭제한다.
 * `user_id` 컬럼을 가진 테이블에만 사용한다.
 */
async function deleteRowsByUserId(
  client: SupabaseServiceClient,
  table: string,
  userId: string,
  requestId: string,
): Promise<void> {
  const { error } = await client.from(table).delete().eq('user_id', userId);
  if (error) {
    log('error', `${table} 데이터 삭제 실패`, { requestId, userId, error });
    throw error;
  }
  log('info', `${table} 데이터 삭제 완료`, { requestId, userId });
}

/**
 * 채팅 데이터를 삭제한다.
 * `chat_messages` 테이블에 `user_id` 컬럼이 없으므로 다음 순서로 처리한다.
 * 1. 사용자가 소유한 채팅방 목록 조회
 * 2. 해당 채팅방에 속한 메시지 삭제
 * 3. 채팅방 삭제
 */
async function deleteChatData(
  client: SupabaseServiceClient,
  userId: string,
  requestId: string,
): Promise<void> {
  const { data: chatRooms, error: chatRoomsError } = await client
    .from('chat_rooms')
    .select('id')
    .eq('user_id', userId);
  if (chatRoomsError) {
    log('error', 'chat_rooms 조회 실패', { requestId, userId, error: chatRoomsError });
    throw chatRoomsError;
  }
  const roomList = (chatRooms ?? []) as Array<{ id: string }>;
  const roomIds = roomList.map((room) => room.id);
  if (roomIds.length > 0) {
    const { error: chatMessagesDeleteError } = await client
      .from('chat_messages')
      .delete()
      .in('chat_room_id', roomIds);
    if (chatMessagesDeleteError) {
      log('error', 'chat_messages 삭제 실패', { requestId, userId, error: chatMessagesDeleteError });
      throw chatMessagesDeleteError;
    }
    log('info', 'chat_messages 데이터 삭제 완료', { requestId, userId });
  }
  const { error: chatRoomsDeleteError } = await client.from('chat_rooms').delete().eq('user_id', userId);
  if (chatRoomsDeleteError) {
    log('error', 'chat_rooms 삭제 실패', { requestId, userId, error: chatRoomsDeleteError });
    throw chatRoomsDeleteError;
  }
  log('info', 'chat_rooms 데이터 삭제 완료', { requestId, userId });
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  log('info', '요청 시작', { requestId });
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    log('info', '계정 삭제 요청 수신', { requestId });

    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    const supabaseUrl = getEnvVar('SUPABASE_URL');
    const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    // Auth 헤더에서 토큰 가져오기
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log('warn', '인증 헤더 누락 또는 형식 오류', { requestId });
      return createErrorResponse('인증 토큰이 필요합니다.', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    log('info', '인증 토큰 수신', { requestId });

    // Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 토큰으로 사용자 ID 조회
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      log('error', '사용자 인증 실패(auth.getUser)', { requestId, error: userError });
      return createErrorResponse('사용자 인증에 실패했습니다.', 401);
    }

    const userId = user.id;
    log('info', `사용자 계정 삭제 진행: ${userId}`, { requestId, userId });

    // 약관 동의로 데이터 활용에 동의한 경우, 탈퇴 플래그 설정
    // Auth metadata에 탈퇴 플래그 설정 (소프트 탈퇴)
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...user.user_metadata,
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      }
    );

    if (metadataError) {
      log('error', '사용자 메타데이터 업데이트 실패', { requestId, error: metadataError });
      throw metadataError;
    }
    log('info', '사용자 메타데이터 업데이트 완료', { requestId, userId });

    await deleteChatData(supabase, userId, requestId);

    const tablesToDelete: string[] = [
      'partner_saju',
      'saju_analyses',
      'birth_info',
    ];
    for (const table of tablesToDelete) {
      await deleteRowsByUserId(supabase, table, userId, requestId);
    }
    log('info', '필수 데이터 삭제 완료', { requestId, userId });
    const durationMs = Date.now() - startedAt;
    log('info', '요청 완료', { requestId, userId, durationMs });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '계정 탈퇴가 완료되었습니다. 구매 내역, 사용 내역, 잔액 정보는 보관됩니다.',
        retainedTables: ['payments', 'usages', 'user_balances'],
        requestId,
      }),
      {
        status: 200,
        headers: getJsonHeaders(),
      }
    );
  } catch (error) {
    log('error', '계정 삭제 처리 실패', { requestId, error });
    return createErrorResponse(
      error instanceof Error ? error.message : '계정 삭제에 실패했습니다.',
      500
    );
  }
});

