export const privateInvestigation = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('private') === '1';

const memory = new Map<string, string>();
export const investigationStorage = {
  getItem(key: string) {
    return privateInvestigation ? memory.get(key) ?? null : localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (privateInvestigation) memory.set(key, value);
    else localStorage.setItem(key, value);
  },
};
