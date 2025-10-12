/// <reference lib="deno.ns" />

/**
 * CORS 헤더 설정 유틸리티
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCorsPreFlight(): Response {
  return new Response('ok', { 
    headers: corsHeaders,
    status: 200,
  });
}

export function getStreamingHeaders(): Record<string, string> {
  return {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

export function getJsonHeaders(): Record<string, string> {
  return {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
}

