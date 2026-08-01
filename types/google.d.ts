interface GoogleTokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
}

interface Google {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void
      prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
      renderButton: (element: HTMLElement, config: Record<string, unknown>) => void
    }
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        callback: (response: { error?: string; access_token?: string }) => void
        scope?: string
      }) => GoogleTokenClient
    }
  }
}

declare global {
  interface Window {
    google?: Google
  }
}

export {}
