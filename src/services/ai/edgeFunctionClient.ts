/**
 * Supabase Edge Function 클라이언트 (React Native용)
 */

import { supabase } from '../../utils/supabaseClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config/env';

const EDGE_FUNCTIONS = {
  TRADITIONAL_SAJU: 'traditional-saju-stream',
  NEW_YEAR_FORTUNE: 'new-year-fortune-stream',
  CHAT: 'chat-stream',
} as const;

/**
 * React Native용 SSE 스트리밍 헬퍼
 */
async function* streamSSE(url: string, body: unknown): AsyncGenerator<string> {
  const { data: { session } } = await supabase.auth.getSession();

  return new Promise<AsyncGenerator<string>>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`);
    
    let buffer = '';
    const generator = async function*() {
      // Generator body will be filled by XHR events
    };
    
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(buffer.length);
      buffer = xhr.responseText;
      
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Emit the chunk
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('스트리밍 요청 실패'));
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.send(JSON.stringify(body));
  });
}

/**
 * 정통사주 스트리밍 (React Native용 - 콜백 방식)
 */
export async function streamTraditionalSaju(
  sajuData: Record<string, unknown>,
  onChunk: (chunk: string) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTIONS.TRADITIONAL_SAJU}`;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`);
    
    let fullText = '';
    let lastPosition = 0;
    
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastPosition);
      lastPosition = xhr.responseText.length;
      
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            // 파싱 에러 무시
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('스트리밍 요청 실패'));
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(fullText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.send(JSON.stringify({ sajuData }));
  });
}

/**
 * 신년운세 스트리밍 (React Native용 - 콜백 방식)
 */
export async function streamNewYearFortune(
  sajuData: Record<string, unknown>,
  calculatedResult: Record<string, unknown>,
  targetYear: number,
  onChunk: (chunk: string) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTIONS.NEW_YEAR_FORTUNE}`;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`);
    
    let fullText = '';
    let lastPosition = 0;
    
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastPosition);
      lastPosition = xhr.responseText.length;
      
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            // 파싱 에러 무시
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('신년운세 스트리밍 요청 실패'));
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(fullText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.send(JSON.stringify({ sajuData, calculatedResult, targetYear }));
  });
}

/**
 * 채팅 스트리밍 (React Native용 - 콜백 방식)
 */
export async function streamChat(
  expertCategory: string,
  messages: Array<{ role: string; content: string }>,
  sajuData: Record<string, unknown>,
  onChunk: (chunk: string) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTIONS.CHAT}`;
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`);
    
    let fullText = '';
    let lastPosition = 0;
    
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastPosition);
      lastPosition = xhr.responseText.length;
      
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            // 파싱 에러 무시
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('채팅 스트리밍 요청 실패'));
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(fullText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.send(JSON.stringify({ expertCategory, messages, sajuData }));
  });
}

/**
 * 오늘의 운세 스트리밍 (Edge Function 사용)
 */
export async function streamTodayFortune(
  calculatedFortune: Record<string, unknown>,
  sajuData: Record<string, unknown>,
  todayDate: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const url = `${SUPABASE_URL}/functions/v1/today-fortune-stream`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    
    let fullText = '';
    let lastPosition = 0;
    
    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastPosition);
      lastPosition = xhr.responseText.length;
      
      const lines = newData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (e) {
            // 파싱 에러 무시
          }
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('오늘의 운세 스트리밍 요청 실패'));
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(fullText);
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.send(JSON.stringify({ calculatedFortune, sajuData, todayDate }));
  });
}

