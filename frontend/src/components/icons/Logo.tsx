import type { SVGProps } from 'react'

/**
 * The Reliable Fresh sprout mark — three leaves off a curved stem, matching
 * the brand logo. Recreated as a scalable SVG (used in the sidebar header
 * and the favicon) rather than a raster export, so it stays crisp at every
 * size without shipping an image asset.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M23 44c-1-9-1-16 1-22"
        stroke="#168A48"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 22c0-9 6-15.5 15-16.5C40 15 34 21.5 24 22Z"
        fill="#20A85A"
      />
      <path
        d="M22.5 27c0-7.2-4.6-12.4-12-13.2-1 8 4 13.4 12 13.2Z"
        fill="#5CCB8E"
      />
      <path
        d="M24 34.5c0-5.6 3.7-9.6 9.8-10.3.7 6.2-3.4 10.4-9.8 10.3Z"
        fill="#20A85A"
      />
    </svg>
  )
}
