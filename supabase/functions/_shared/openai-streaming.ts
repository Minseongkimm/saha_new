/// <reference lib="deno.ns" />

/**
 * OpenAI 스트리밍 핵심 유틸리티
 */

import { OpenAIMessage } from "./types.ts";
import { StreamingError } from "./error-handler.ts";

export interface OpenAIStreamingConfig {
  apiKey: string;
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export async function createOpenAIStream(
  config: OpenAIStreamingConfig,
): Promise<ReadableStream> {
  const {
    apiKey,
    model,
    messages,
    temperature = 0.7,
    maxTokens = 4000,
    topP = 1.0,
    frequencyPenalty = 0.0,
    presencePenalty = 0.0,
  } = config;

  if (!apiKey) {
    throw new StreamingError("OpenAI API key is required", 500);
  }

  const isGpt5Family = model.startsWith("gpt-5");
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    // 캐시 히트 여부(prompt_tokens_details.cached_tokens)를 실측하기 위해 필요
    stream_options: { include_usage: true },
  };

  if (isGpt5Family) {
    requestBody.max_completion_tokens = maxTokens;
  } else {
    requestBody.temperature = temperature;
    requestBody.max_tokens = maxTokens;
    requestBody.top_p = topP;
    requestBody.frequency_penalty = frequencyPenalty;
    requestBody.presence_penalty = presencePenalty;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new StreamingError(
      `OpenAI API error: ${response.statusText}`,
      response.status,
      JSON.stringify(errorData),
    );
  }

  if (!response.body) {
    throw new StreamingError("No response body from OpenAI", 500);
  }

  return response.body;
}

export function transformToSSE(openaiStream: ReadableStream): ReadableStream {
  const reader = openaiStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (!trimmedLine || trimmedLine === "data: [DONE]") {
              continue;
            }

            if (trimmedLine.startsWith("data: ")) {
              controller.enqueue(encoder.encode(trimmedLine + "\n\n"));
            }
          }
        }
      } catch (error) {
        console.error("Stream transformation error:", error);
        controller.error(error);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}
