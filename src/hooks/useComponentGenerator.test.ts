import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';
import { saveComponents, saveHistory } from '../utils/storage';

const stored = {
  id: 'saved-1',
  prompt: '저장된 버튼',
  code: 'render(<button />)',
  createdAt: new Date('2026-10-14T00:00:00Z'),
};

function mockGenerateSuccess(code = 'render(<div />)') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code }) }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator 영속성', () => {
  it('마운트 시 저장된 컴포넌트 목록을 복원한다', () => {
    saveComponents([stored]);
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components).toEqual([stored]);
  });

  it('컴포넌트를 생성하면 localStorage에도 저장된다', async () => {
    mockGenerateSuccess('render(<p />)');
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('문단', undefined, 'google'));

    const saved = JSON.parse(localStorage.getItem('rcg:components') ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ prompt: '문단', code: 'render(<p />)' });
  });

  it('생성을 요청한 프롬프트가 히스토리 맨 앞에 쌓이고 저장된다', async () => {
    saveHistory(['예전 프롬프트']);
    mockGenerateSuccess();
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.history).toEqual(['예전 프롬프트']);

    await act(() => result.current.generate('새 프롬프트', undefined, 'google'));

    expect(result.current.history).toEqual(['새 프롬프트', '예전 프롬프트']);
    expect(JSON.parse(localStorage.getItem('rcg:history') ?? '[]')).toEqual([
      '새 프롬프트',
      '예전 프롬프트',
    ]);
  });

  it('컴포넌트를 삭제하면 저장된 목록에서도 사라진다', async () => {
    saveComponents([stored]);
    const { result } = renderHook(() => useComponentGenerator());

    act(() => result.current.removeComponent('saved-1'));

    await waitFor(() => expect(localStorage.getItem('rcg:components')).toBe('[]'));
  });
});
