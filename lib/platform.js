/**
 * Platform detection utilities
 * Determines if app is running on native iOS/Android or web
 */

export function isNativePlatform() {
  if (typeof window === 'undefined') return false
  
  // Check for Capacitor
  if (window.Capacitor) {
    return true
  }
  
  // Check user agent for native app indicators
  const ua = window.navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  
  // Check if running in Capacitor WebView
  const isCapacitor = window.Capacitor || 
    (isIOS && window.webkit?.messageHandlers) ||
    (isAndroid && window.Android)
  
  return isCapacitor || false
}

export function isIOS() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
}

export function isAndroid() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Android/.test(ua)
}

export function getPlatform() {
  if (isNativePlatform()) {
    if (isIOS()) return 'ios'
    if (isAndroid()) return 'android'
    return 'native'
  }
  return 'web'
}

