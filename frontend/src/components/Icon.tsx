import type { CSSProperties, ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  "more-vertical": (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M5 2h9l5 5v15H5V2Zm9 0v6h5M8 12h8M8 16h8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z" />
      <path d="M13 21h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2" />
    </>
  ),
  pause: (
    <>
      <path d="M7 4h3v16H7zM14 4h3v16h-3z" />
    </>
  ),
  play: <path d="m7 3 14 9-14 9V3Z" />,
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6" />
    </>
  ),
  paperclip: (
    <path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7L13 2a2 2 0 0 1 5 5L8 17a1 1 0 0 1-3-3l10-10" />
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 7L22 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 2v6m10-6v6M3 11h18" />
    </>
  ),
  "check-check": <path d="m2 12 5 5L18 6m-6 10 3 2 8-9" />,
  home: (
    <>
      <path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 7h14l1 14H4L5 7ZM9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M9 11h.01M15 11h.01" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-8.5A8.5 8.5 0 0 1 11.5 4h1a8.5 8.5 0 0 1 8.5 7.5Z" />
      <path d="M7 10h10M7 14h7" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 3 1 4-3v-4l2-3-2-4-3-1-1-3H9Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H4V3h5M14 8l5 4-5 4M8 12h11" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "arrow-right": <path d="M4 12h16m-6-6 6 6-6 6" />,
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  x: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  laptop: (
    <>
      <rect x="4" y="3" width="16" height="13" rx="2" />
      <path d="M2 20h20M8 20h8" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 5h4M11 19h2" />
    </>
  ),
  "washing-machine": (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <circle cx="12" cy="14" r="5" />
      <path d="M7 6h.01M11 6h6M8 13c2 3 5-2 8 1" />
    </>
  ),
  shirt: <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z" />,
  shoe: (
    <>
      <path d="m3 15 4-9 4 5 4-2 3 5 3 1v5H3v-5Z" />
      <path d="M4 16h16M10 11l-2 3M14 11l-2 3" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C8 2 3 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-1-1-6-2-10 1ZM12 5v16" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6 12h12M3 8v8M6 6v12M18 6v12M21 8v8" />
    </>
  ),
  armchair: (
    <>
      <path d="M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5M5 17v4M19 17v4M5 17h14v-6h3v-1a2 2 0 0 0-4 0v4H6v-4a2 2 0 0 0-4 0v1h3v6Z" />
    </>
  ),
  beauty: (
    <>
      <path d="M7 7h10l2 14H5L7 7ZM9 7V3h6v4" />
      <path d="M9 12h6" />
    </>
  ),
  list: (
    <>
      <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 4v6m0 4v6M12 4v10m0 4v2M20 4v2m0 4v10M1 10h6M9 14h6M17 6h6" />
    </>
  ),
  package: (
    <>
      <path d="m12 2 10 5v10l-10 5-10-5V7l10-5ZM2 7l10 5 10-5M12 12v10M7 4.5l10 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  shield: (
    <>
      <path d="m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  headphones: (
    <>
      <path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H5a2 2 0 0 1-2-2v-7ZM21 12h-4v9h2a2 2 0 0 0 2-2v-7Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m9 10.5 6-4m-6 7 6 4" />
    </>
  ),
  alert: (
    <>
      <path d="m10 4-8 14a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2.3 2.3 0 0 0-4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </>
  ),
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 1v5m6-5v5M9 18v5m6-5v5M1 9h5m-5 6h5M18 9h5m-5 6h5" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </>
  ),
  memory: (
    <>
      <path d="M3 6h18v12H3zM6 3v3m4-3v3m4-3v3m4-3v3M6 18v3m4-3v3m4-3v3m4-3v3" />
      <path d="M7 10v4m5-4v4m5-4v4" />
    </>
  ),
  "hard-drive": (
    <>
      <path d="m5 4-3 10v6h20v-6L19 4H5ZM2 14h20M6 17h.01M10 17h.01" />
    </>
  ),
  tag: (
    <>
      <path d="M3 3h8l10 10-8 8L3 11V3Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>
  ),
  maximize: <path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6" />,
};

const aliases: Record<string, string> = {
  electronics: "laptop",
  phone: "smartphone",
  mobile: "smartphone",
  appliance: "washing-machine",
  washingMachine: "washing-machine",
  refrigerator: "washing-machine",
  shoes: "shoe",
  footwear: "shoe",
  footprints: "shoe",
  books: "book",
  "book-open": "book",
  sports: "dumbbell",
  furniture: "armchair",
  sofa: "armchair",
  "shopping-bag": "bag",
  "shopping-basket": "bag",
  "layout-grid": "grid",
  "grid-2x2": "grid",
  sparkles: "beauty",
  "more-horizontal": "grid",
  "gamepad-2": "grid",
  mapPin: "map-pin",
  "share-2": "share",
  "alert-triangle": "alert",
  "memory-stick": "memory",
  "shield-check": "shield",
  "badge-check": "check",
  layers: "package",
};

export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[aliases[name] ?? name] ?? paths.grid}
    </svg>
  );
}
