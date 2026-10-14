import { describe, it, expect } from 'vitest';
import { validatePrompt } from './validatePrompt';

describe('validatePrompt', () => {
  it('짧은 프롬프트는 유효하고 길이를 반환한다', () => {
    expect(validatePrompt('버튼 만들어줘')).toEqual({ valid: true, length: 7 });
  });

  it('500자는 유효하고 501자부터는 오류 메시지와 함께 무효다', () => {
    expect(validatePrompt('가'.repeat(500)).valid).toBe(true);
    expect(validatePrompt('가'.repeat(501))).toEqual({
      valid: false,
      length: 501,
      error: '프롬프트는 500자 이하로 입력해주세요.',
    });
  });

  it('앞뒤 공백은 길이에 포함하지 않는다 (제출 시 trim 되므로)', () => {
    const result = validatePrompt(`  ${'가'.repeat(500)}  `);
    expect(result).toEqual({ valid: true, length: 500 });
  });
});
