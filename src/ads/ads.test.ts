import { describe, it, expect, vi, beforeEach } from 'vitest'
import { showRewardedAd, skipAd, onAdAnalytics } from './ads.js'
import type { AdAnalyticsEvent } from './ads.js'

describe('showRewardedAd', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  it('광고 시청 완료 시 watched: true 반환', async () => {
    const promise = showRewardedAd('revive', 3)
    vi.advanceTimersByTime(1000)
    const result = await promise
    expect(result.watched).toBe(true)
    expect(result.rewardType).toBe('revive')
  })
  it('ad_requested와 ad_watched 이벤트 발생', async () => {
    const events: AdAnalyticsEvent[] = []
    const unsub = onAdAnalytics((e) => events.push(e))
    const promise = showRewardedAd('atk_boost', 5)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('ad_requested')
    expect(events[0]!.rewardType).toBe('atk_boost')
    expect(events[0]!.floor).toBe(5)
    vi.advanceTimersByTime(1000)
    await promise
    expect(events).toHaveLength(2)
    expect(events[1]!.type).toBe('ad_watched')
    unsub()
  })
})

describe('skipAd', () => {
  it('ad_skipped 이벤트 발생', () => {
    const events: AdAnalyticsEvent[] = []
    const unsub = onAdAnalytics((e) => events.push(e))
    skipAd('revive', 2)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('ad_skipped')
    expect(events[0]!.rewardType).toBe('revive')
    expect(events[0]!.floor).toBe(2)
    unsub()
  })
})

describe('onAdAnalytics', () => {
  it('구독 해제 후 이벤트 수신하지 않음', () => {
    const events: AdAnalyticsEvent[] = []
    const unsub = onAdAnalytics((e) => events.push(e))
    unsub()
    skipAd('full_heal', 1)
    expect(events).toHaveLength(0)
  })
})
