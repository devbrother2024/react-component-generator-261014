import type { GeneratedComponent, Provider } from '../types';

export const MAX_HISTORY = 20;

export function addToHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((item) => item !== prompt)].slice(0, MAX_HISTORY);
}

const KEYS = {
  provider: 'rcg:provider',
  history: 'rcg:history',
  components: 'rcg:components',
} as const;

function readItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 용량 초과·접근 차단 시에도 앱은 메모리 상태로 계속 동작해야 한다.
  }
}

function readJSON(key: string): unknown {
  try {
    return JSON.parse(readItem(key) ?? 'null');
  } catch {
    return null;
  }
}

export function loadProvider(): Provider {
  const value = readItem(KEYS.provider);
  return value === 'anthropic' || value === 'google' ? value : 'google';
}

export function saveProvider(provider: Provider): void {
  writeItem(KEYS.provider, provider);
}

export function loadHistory(): string[] {
  const value = readJSON(KEYS.history);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function saveHistory(history: string[]): void {
  writeItem(KEYS.history, JSON.stringify(history));
}

export function loadComponents(): GeneratedComponent[] {
  const value = readJSON(KEYS.components);
  if (!Array.isArray(value)) return [];
  const components: GeneratedComponent[] = [];
  for (const item of value) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      typeof item.prompt !== 'string' ||
      typeof item.code !== 'string'
    ) {
      continue;
    }
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;
    components.push({ id: item.id, prompt: item.prompt, code: item.code, createdAt });
  }
  return components;
}

export function saveComponents(components: GeneratedComponent[]): void {
  writeItem(KEYS.components, JSON.stringify(components));
}
