import { supabase } from '../database/supabaseClient';

export type InfoIntent =
  | 'normal_chat'
  | 'self_birth_info'
  | 'partner_birth_info'
  | 'partner_selection_needed';

export interface InfoIntentClassification {
  intent: InfoIntent;
  confidence: number;
  reason: string;
  source: 'llm' | 'fallback';
}

const VALID_INTENTS: InfoIntent[] = [
  'normal_chat',
  'self_birth_info',
  'partner_birth_info',
  'partner_selection_needed',
];

const DEFAULT_CLASSIFICATION: InfoIntentClassification = {
  intent: 'normal_chat',
  confidence: 0.35,
  reason: '분류에 실패하면 일반 상담으로 진행합니다.',
  source: 'fallback',
};

const isValidIntent = (intent: unknown): intent is InfoIntent => (
  typeof intent === 'string' && VALID_INTENTS.includes(intent as InfoIntent)
);

export const classifyInfoIntent = async (message: string): Promise<InfoIntentClassification> => {
  try {
    const { data, error } = await supabase.functions.invoke('classify-info-intent', {
      body: { message },
    });

    if (error) {
      throw error;
    }

    if (!isValidIntent(data?.intent)) {
      return DEFAULT_CLASSIFICATION;
    }

    const rawConfidence = typeof data.confidence === 'number'
      ? data.confidence
      : DEFAULT_CLASSIFICATION.confidence;
    const confidence = Math.max(0, Math.min(1, rawConfidence));

    return {
      intent: data.intent,
      confidence,
      reason: typeof data.reason === 'string' ? data.reason.slice(0, 120) : '',
      source: 'llm',
    };
  } catch (error) {
    console.error('classifyInfoIntent error:', error);
    return DEFAULT_CLASSIFICATION;
  }
};
