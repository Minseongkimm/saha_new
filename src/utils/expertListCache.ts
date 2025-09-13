import { Expert } from '../types/expert';

let cachedExperts: Expert[] | null = null;
let cachedAtMs: number | null = null;

export const getExpertListCache = (): Expert[] | null => {
  return cachedExperts ? [...cachedExperts] : null;
};

export const setExpertListCache = (items: Expert[]): void => {
  cachedExperts = [...items];
  cachedAtMs = Date.now();
};

export const isExpertListFresh = (maxAgeMs: number): boolean => {
  if (!cachedAtMs) return false;
  return Date.now() - cachedAtMs < maxAgeMs;
};

export const invalidateExpertListCache = (): void => {
  cachedExperts = null;
  cachedAtMs = null;
};


