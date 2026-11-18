// Line icons for the top bar. They take the text colour around them and are hidden from screen
// readers: every place that uses one also has a text label.

type IconProps = { className?: string };

// The shared <svg> wrapper: a 24-unit grid drawn with 1.8-wide round strokes. It renders at 20px
// unless CSS sets a size; the top bar's buttons and search box set 16px, as in Figma.
function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// A magnifying glass, at the start of the search box.
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </Icon>
  );
}

// A speech bubble, for the messages button.
export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.3A7.5 7.5 0 1 1 20 11.5Z" />
    </Icon>
  );
}

// A bell, for the notifications button.
export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Icon>
  );
}
