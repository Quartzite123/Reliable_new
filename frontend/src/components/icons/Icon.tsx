import type { SVGProps } from 'react'

/**
 * Small inline line-icon set (Lucide-style: 24x24, stroke=currentColor,
 * round caps). Kept as one file of tiny components instead of a package
 * dependency — this app only needs ~25 of them. Every icon is decorative
 * (`aria-hidden`) and sits next to real text, so it never changes an
 * element's accessible name.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function TasksIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.5 11 15l4.5-5.5" />
    </svg>
  )
}

export function RecordsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2.5h5.5A2.5 2.5 0 0 1 20 9v8.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function HelpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.7 9.3a2.3 2.3 0 1 1 3.3 2.1c-.9.5-1 1-1 1.9" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function FarmersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5" />
      <circle cx="17.5" cy="8.5" r="2.3" />
      <path d="M15.8 12.8c2 .3 3.4 1.9 3.8 4.2" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  )
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  )
}

export function FlaskIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3h4M10 3v6.2L5.3 18a1.6 1.6 0 0 0 1.4 2.4h10.6a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3" />
      <path d="M8.3 15h7.4" />
    </svg>
  )
}

export function ContractIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7L18.5 8v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4.5M9 12.5h6M9 16h4" />
    </svg>
  )
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h10v9H3z" />
      <path d="M13 10.5h3.6L19 13v3h-6z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  )
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18M7 21h10" />
      <path d="M5 7h4M15 7h4" />
      <path d="M3.5 7 7 13a2.5 2.5 0 0 1-5 0Z" />
      <path d="M17 7l3.5 6a2.5 2.5 0 0 1-5 0Z" />
    </svg>
  )
}

export function SearchCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-3.4-3.4M8 10.5l1.7 1.7L13.5 8" />
    </svg>
  )
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12.5 6.5 5h11l2.5 7.5" />
      <path d="M4 12.5h4.8l1 2.2h4.4l1-2.2H20V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18Z" />
    </svg>
  )
}

export function PackageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.5 8 8.5-4.5L20.5 8v8L12 20.5 3.5 16Z" />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5V21" />
    </svg>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </svg>
  )
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5v19M4.4 6.75l15.2 10.5M19.6 6.75 4.4 17.25" />
      <path d="M12 2.5 9.8 4.7M12 2.5l2.2 2.2M12 21.5l-2.2-2.2M12 21.5l2.2-2.2" />
    </svg>
  )
}

export function BoxesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m7 4 4.5-2.3L16 4v5l-4.5 2.3L7 9Z" />
      <path d="M3 12.7 7 11l4 1.7v5L7 19.4l-4-1.7Z" />
      <path d="m13 12.7 4-1.7 4 1.7v5l-4 1.7-4-1.7Z" />
    </svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 6h11M8.5 12h11M8.5 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  )
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17.5" cy="19.5" r="1.4" />
      <path d="M3 4h2.2l2 11.2A2 2 0 0 0 9.2 17h8.4a2 2 0 0 0 2-1.6L21 8H6.2" />
    </svg>
  )
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h6.5L18 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8H18M8.5 12.5h7M8.5 16h7" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10.5M11 20V4M18 20v-7" />
      <path d="M3 20.5h18" />
    </svg>
  )
}

export function UsersCogIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3 19c.4-3.2 2.7-5.3 5.5-5.3" />
      <circle cx="17" cy="16.5" r="3" />
      <path d="M17 12.3v.9M17 19.3v.9M20.5 16.5h-.9M14.4 16.5h-.9M19.6 13.9l-.6.6M15 18.5l-.6.6M19.6 19.1l-.6-.6M15 14.5l-.6-.6" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.3-.9c.75.66 1.63 1.17 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4Z" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 20H5.5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M16 16.5 20.5 12 16 7.5M20.5 12h-11" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  )
}

export function InboxEmptyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13 6.5 5h11L20 13" />
      <path d="M4 13h5l1.2 2.4h3.6L15 13h5v5.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z" />
    </svg>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </svg>
  )
}
export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.7 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.9 3.6" />
      <path d="M6.3 7.9A17 17 0 0 0 2.5 12S6 18 12 18a8.9 8.9 0 0 0 3.4-.65" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3.5 3.5 17 17" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  )
}