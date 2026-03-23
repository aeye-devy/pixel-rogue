import { describe, it, expect } from 'vitest'
import { resolveSwipeDirection, resolveKeyDirection } from './input.js'

describe('resolveKeyDirection', () => {
  it('화살표 키를 방향으로 매핑', () => {
    expect(resolveKeyDirection('ArrowUp')).toBe('up')
    expect(resolveKeyDirection('ArrowDown')).toBe('down')
    expect(resolveKeyDirection('ArrowLeft')).toBe('left')
    expect(resolveKeyDirection('ArrowRight')).toBe('right')
  })
  it('WASD 키를 방향으로 매핑', () => {
    expect(resolveKeyDirection('w')).toBe('up')
    expect(resolveKeyDirection('a')).toBe('left')
    expect(resolveKeyDirection('s')).toBe('down')
    expect(resolveKeyDirection('d')).toBe('right')
  })
  it('대문자 WASD도 방향으로 매핑', () => {
    expect(resolveKeyDirection('W')).toBe('up')
    expect(resolveKeyDirection('A')).toBe('left')
    expect(resolveKeyDirection('S')).toBe('down')
    expect(resolveKeyDirection('D')).toBe('right')
  })
  it('매핑되지 않은 키는 null 반환', () => {
    expect(resolveKeyDirection('Enter')).toBeNull()
    expect(resolveKeyDirection('Space')).toBeNull()
    expect(resolveKeyDirection('x')).toBeNull()
  })
})

describe('resolveSwipeDirection', () => {
  it('오른쪽 스와이프 감지', () => {
    expect(resolveSwipeDirection(50, 10)).toBe('right')
  })
  it('왼쪽 스와이프 감지', () => {
    expect(resolveSwipeDirection(-50, 10)).toBe('left')
  })
  it('아래쪽 스와이프 감지', () => {
    expect(resolveSwipeDirection(10, 50)).toBe('down')
  })
  it('위쪽 스와이프 감지', () => {
    expect(resolveSwipeDirection(10, -50)).toBe('up')
  })
  it('최소 거리 미만 스와이프는 null 반환', () => {
    expect(resolveSwipeDirection(10, 5)).toBeNull()
    expect(resolveSwipeDirection(0, 0)).toBeNull()
    expect(resolveSwipeDirection(20, 20)).toBeNull()
  })
  it('대각선 스와이프는 더 큰 축 기준으로 방향 결정', () => {
    expect(resolveSwipeDirection(60, 40)).toBe('right')
    expect(resolveSwipeDirection(40, -60)).toBe('up')
  })
})
