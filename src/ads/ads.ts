// -- Rewarded ad stub --
// Simulates ad SDK calls. Replace with real Apps in Toss AdMob integration later.

export type AdRewardType = 'revive' | 'atk_boost' | 'full_heal'

export interface AdResult {
  watched: boolean
  rewardType: AdRewardType
}

export interface AdAnalyticsEvent {
  type: 'ad_requested' | 'ad_watched' | 'ad_skipped'
  rewardType: AdRewardType
  floor: number
  timestamp: number
}

type AnalyticsListener = (event: AdAnalyticsEvent) => void

const STUB_AD_DELAY_MS = 800

let analyticsListeners: AnalyticsListener[] = []

export function onAdAnalytics(listener: AnalyticsListener): () => void {
  analyticsListeners.push(listener)
  return () => {
    analyticsListeners = analyticsListeners.filter((l) => l !== listener)
  }
}

function emitAnalytics(event: AdAnalyticsEvent): void {
  for (const listener of analyticsListeners) {
    listener(event)
  }
}

/**
 * Show a rewarded ad. Returns a promise that resolves with the result.
 * Stub: simulates a short delay then grants the reward.
 */
export function showRewardedAd(
  rewardType: AdRewardType,
  floor: number,
): Promise<AdResult> {
  emitAnalytics({ type: 'ad_requested', rewardType, floor, timestamp: Date.now() })
  return new Promise((resolve) => {
    setTimeout(() => {
      emitAnalytics({ type: 'ad_watched', rewardType, floor, timestamp: Date.now() })
      resolve({ watched: true, rewardType })
    }, STUB_AD_DELAY_MS)
  })
}

/**
 * Record that the user skipped an ad prompt.
 */
export function skipAd(rewardType: AdRewardType, floor: number): void {
  emitAnalytics({ type: 'ad_skipped', rewardType, floor, timestamp: Date.now() })
}
