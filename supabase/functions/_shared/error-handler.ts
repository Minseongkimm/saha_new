/// <reference lib="deno.ns" />

/**
 * 에러 핸들링 유틸리티
 */

import { ErrorResponse } from './types.ts';
import { getJsonHeaders } from './cors.ts';

export class StreamingError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: string
  ) {
    super(message);
    this.name = 'StreamingError';
  }
}

export function createErrorResponse(
  error: unknown,
  statusCode: number = 500
): Response {
  console.error('Error occurred:', error);

  const errorResponse: ErrorResponse = {
    error: error instanceof Error ? error.message : 'Unknown error occurred',
    details: error instanceof StreamingError ? error.details : undefined,
    timestamp: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: error instanceof StreamingError ? error.statusCode : statusCode,
      headers: getJsonHeaders(),
    }
  );
}

export function validateRequest(body: unknown, requiredFields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw new StreamingError('Request body is required', 400);
  }

  const bodyObj = body as Record<string, unknown>;
  
  for (const field of requiredFields) {
    if (!(field in bodyObj)) {
      throw new StreamingError(
        `Missing required field: ${field}`,
        400,
        `Required fields: ${requiredFields.join(', ')}`
      );
    }
  }
}

export function validateEnvVars(vars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of vars) {
    if (!Deno.env.get(varName)) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new StreamingError(
      'Missing required environment variables',
      500,
      `Missing: ${missing.join(', ')}`
    );
  }
}

