let cachedList: any[] | null = null;
let cachedAtMs: number | null = null;
let needsRefresh: boolean = false;

export const getChatListCache = (): any[] | null => {
  return cachedList ? [...cachedList] : null;
};

export const setChatListCache = (items: any[]): void => {
  cachedList = [...items];
  cachedAtMs = Date.now();
};

export const isChatListFresh = (maxAgeMs: number): boolean => {
  if (!cachedAtMs) return false;
  return Date.now() - cachedAtMs < maxAgeMs;
};

export const invalidateChatListCache = (): void => {
  cachedList = null;
  cachedAtMs = null;
};

export const markChatListNeedsRefresh = (): void => {
  needsRefresh = true;
};

export const consumeChatListNeedsRefresh = (): boolean => {
  if (needsRefresh) {
    needsRefresh = false;
    return true;
  }
  return false;
};

export const updateChatListPreview = (roomId: string, lastMessage: string, timestampLabel: string): void => {
  if (!cachedList) return;
  const next = [...cachedList];
  const idx = next.findIndex((it: any) => it.id === roomId);
  if (idx >= 0) {
    next[idx] = { ...next[idx], lastMessage, timestamp: timestampLabel };
    // 최상단으로 이동 (최근 대화)
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    cachedList = next;
    cachedAtMs = Date.now();
  }
};


