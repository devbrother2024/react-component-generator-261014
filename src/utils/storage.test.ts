import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addToHistory,
  loadComponents,
  loadHistory,
  loadProvider,
  saveComponents,
  saveHistory,
  saveProvider,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addToHistory', () => {
  it('새 프롬프트를 목록 맨 앞에 추가한다', () => {
    expect(addToHistory(['b', 'a'], 'c')).toEqual(['c', 'b', 'a']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addToHistory(['b', 'a'], 'a')).toEqual(['a', 'b']);
  });

  it('최대 20개까지만 유지하고 오래된 항목부터 버린다', () => {
    const history = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const result = addToHistory(history, 'new');
    expect(result).toHaveLength(20);
    expect(result[0]).toBe('new');
    expect(result).not.toContain('p19');
  });
});

describe('provider 저장', () => {
  it('저장된 값이 없으면 기본값 google을 반환한다', () => {
    expect(loadProvider()).toBe('google');
  });

  it('저장한 provider를 다시 불러온다', () => {
    saveProvider('anthropic');
    expect(loadProvider()).toBe('anthropic');
  });

  it('알 수 없는 값이 저장되어 있으면 기본값 google을 반환한다', () => {
    localStorage.setItem('rcg:provider', 'openai');
    expect(loadProvider()).toBe('google');
  });

  it('localStorage 읽기가 예외를 던져도 기본값 google을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadProvider()).toBe('google');
  });

  it('localStorage 쓰기가 예외를 던져도 저장 함수는 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveProvider('anthropic')).not.toThrow();
  });
});

describe('프롬프트 히스토리 저장', () => {
  it('저장한 히스토리를 순서 그대로 불러온다', () => {
    saveHistory(['b', 'a']);
    expect(loadHistory()).toEqual(['b', 'a']);
  });

  it('JSON이 손상되어 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem('rcg:history', '{broken');
    expect(loadHistory()).toEqual([]);
  });

  it('문자열이 아닌 항목은 걸러낸다', () => {
    localStorage.setItem('rcg:history', JSON.stringify(['a', 1, null, 'b']));
    expect(loadHistory()).toEqual(['a', 'b']);
  });
});

describe('생성된 컴포넌트 저장', () => {
  it('저장한 컴포넌트를 createdAt이 Date인 채로 불러온다', () => {
    const component = {
      id: '1',
      prompt: '버튼',
      code: 'render(<button />)',
      createdAt: new Date('2026-10-14T00:00:00Z'),
    };
    saveComponents([component]);
    expect(loadComponents()).toEqual([component]);
  });

  it('형식이 맞지 않는 항목은 걸러내고 유효한 항목만 불러온다', () => {
    const valid = { id: '1', prompt: 'p', code: 'c', createdAt: '2026-10-14T00:00:00.000Z' };
    localStorage.setItem(
      'rcg:components',
      JSON.stringify([valid, { id: 2 }, null, 'x', { ...valid, id: '3', createdAt: 'invalid' }]),
    );
    expect(loadComponents().map((c) => c.id)).toEqual(['1']);
  });

  it('JSON이 손상되어 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem('rcg:components', '{broken');
    expect(loadComponents()).toEqual([]);
  });
});
