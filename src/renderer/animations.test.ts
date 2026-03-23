import { describe, it, expect } from 'vitest'
import { createAnimationManager, easeOutQuad } from './animations.js'

describe('easeOutQuad', () => {
  it('t=0일 때 0 반환', () => {
    expect(easeOutQuad(0)).toBe(0)
  })
  it('t=1일 때 1 반환', () => {
    expect(easeOutQuad(1)).toBe(1)
  })
  it('t=0.5일 때 0.75 반환', () => {
    expect(easeOutQuad(0.5)).toBe(0.75)
  })
})

describe('AnimationManager', () => {
  it('초기 상태에서 애니메이션 없음', () => {
    const mgr = createAnimationManager()
    expect(mgr.isAnimating()).toBe(false)
    expect(mgr.getActive()).toHaveLength(0)
  })
  it('이동 애니메이션 추가 후 활성 상태 확인', () => {
    const mgr = createAnimationManager()
    mgr.addMove({ x: 0, y: 0 }, { x: 1, y: 0 })
    expect(mgr.isAnimating()).toBe(true)
    expect(mgr.getActive()).toHaveLength(1)
    expect(mgr.getActive()[0]!.kind).toBe('move')
  })
  it('충분한 시간 경과 후 애니메이션 완료', () => {
    const mgr = createAnimationManager()
    mgr.addMove({ x: 0, y: 0 }, { x: 1, y: 0 })
    mgr.update(0.2) // move duration is 0.1s
    expect(mgr.isAnimating()).toBe(false)
  })
  it('히어로 오프셋이 이동 애니메이션 진행에 따라 변함', () => {
    const mgr = createAnimationManager()
    mgr.addMove({ x: 0, y: 0 }, { x: 1, y: 0 })
    const offsetStart = mgr.getHeroOffset()
    expect(offsetStart.dx).toBe(-1) // starts from fromX - toX = -1
    mgr.update(0.05) // half of move duration
    const offsetMid = mgr.getHeroOffset()
    expect(Math.abs(offsetMid.dx)).toBeLessThan(Math.abs(offsetStart.dx))
  })
  it('애니메이션 없을 때 히어로 오프셋은 0', () => {
    const mgr = createAnimationManager()
    const offset = mgr.getHeroOffset()
    expect(offset.dx).toBe(0)
    expect(offset.dy).toBe(0)
  })
  it('플래시 애니메이션 추가 및 완료', () => {
    const mgr = createAnimationManager()
    mgr.addFlash({ x: 2, y: 3 }, '#ff0000')
    expect(mgr.getActive()).toHaveLength(1)
    expect(mgr.getActive()[0]!.kind).toBe('flash')
    mgr.update(0.2) // flash duration is 0.15s
    expect(mgr.isAnimating()).toBe(false)
  })
  it('떠오르는 텍스트 애니메이션 추가', () => {
    const mgr = createAnimationManager()
    mgr.addFloatText({ x: 1, y: 1 }, '+3', '#ff0000')
    expect(mgr.getActive()).toHaveLength(1)
    expect(mgr.getActive()[0]!.kind).toBe('floatText')
  })
  it('화면 플래시 애니메이션 추가', () => {
    const mgr = createAnimationManager()
    mgr.addScreenFlash('#00ff00')
    expect(mgr.getActive()).toHaveLength(1)
    expect(mgr.getActive()[0]!.kind).toBe('screenFlash')
  })
  it('여러 애니메이션 동시 처리', () => {
    const mgr = createAnimationManager()
    mgr.addMove({ x: 0, y: 0 }, { x: 1, y: 0 })
    mgr.addFlash({ x: 1, y: 0 }, '#ff0000')
    mgr.addFloatText({ x: 1, y: 0 }, '-2', '#ffffff')
    expect(mgr.getActive()).toHaveLength(3)
    mgr.update(0.05)
    expect(mgr.isAnimating()).toBe(true)
    mgr.update(1) // well past all durations
    expect(mgr.isAnimating()).toBe(false)
  })
  it('update가 활성 애니메이션 존재 시 true 반환', () => {
    const mgr = createAnimationManager()
    mgr.addFlash({ x: 0, y: 0 }, '#ff0000')
    expect(mgr.update(0.01)).toBe(true)
    expect(mgr.update(0.5)).toBe(false)
  })
})
