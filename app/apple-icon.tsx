import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <svg width="180" height="180" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="0" fill="#9D00FF" />
          <g transform="translate(256 256) scale(0.86) translate(-256 -256)" fill="none" stroke="#FFFFFF" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
            <path d="M150 176V150a24 24 0 0 1 24-24h164a24 24 0 0 1 24 24v26" />
            <rect x="108" y="176" width="296" height="214" rx="44" />
            <rect x="296" y="244" width="108" height="78" rx="28" />
            <circle cx="338" cy="283" r="9" fill="#FFFFFF" stroke="none" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  )
}
