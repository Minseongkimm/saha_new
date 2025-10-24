import { PartnerSaju } from '../types/partner';

let cachedPartners: PartnerSaju[] | null = null;
let cachedAtMs: number | null = null;

export const getPartnerListCache = (): PartnerSaju[] | null => {
  return cachedPartners ? [...cachedPartners] : null;
};

export const setPartnerListCache = (items: PartnerSaju[]): void => {
  cachedPartners = [...items];
  cachedAtMs = Date.now();
};

export const isPartnerListFresh = (maxAgeMs: number = 5 * 60 * 1000): boolean => {
  if (!cachedAtMs) return false;
  return Date.now() - cachedAtMs < maxAgeMs;
};

export const invalidatePartnerListCache = (): void => {
  cachedPartners = null;
  cachedAtMs = null;
};

export const addPartnerToCache = (partner: PartnerSaju): void => {
  if (cachedPartners) {
    cachedPartners = [partner, ...cachedPartners];
  }
};

export const updatePartnerInCache = (partnerId: string, updatedPartner: PartnerSaju): void => {
  if (cachedPartners) {
    const index = cachedPartners.findIndex(p => p.id === partnerId);
    if (index !== -1) {
      cachedPartners[index] = updatedPartner;
    }
  }
};

export const removePartnerFromCache = (partnerId: string): void => {
  if (cachedPartners) {
    cachedPartners = cachedPartners.filter(p => p.id !== partnerId);
  }
};
