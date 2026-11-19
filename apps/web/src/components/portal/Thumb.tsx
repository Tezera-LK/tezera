import ui from "./ui.module.css";

type ThumbProps = {
  // width and height in px
  size: number;
  // square corners in px; ignored for "round"
  radius?: number;
  // "round" for people, "image" for an event photo (Figma's crossed box)
  shape?: "square" | "round" | "image";
  // a different height, for the wide event photo (220 x 150)
  height?: number;
};

// A grey placeholder where a photo or icon will go. Figma draws these as grey boxes too; real
// pictures arrive with profile and event photos (EN-03 storage). Hidden from screen readers.
export default function Thumb({ size, radius = 4, shape = "square", height = size }: ThumbProps) {
  const className = `${ui.thumb} ${shape === "round" ? ui.thumbRound : ""} ${shape === "image" ? ui.thumbImage : ""}`;
  const style = { width: size, height, ...(shape === "square" ? { borderRadius: radius } : {}) };

  return (
    <span className={className} style={style} aria-hidden="true">
      {shape === "image" && (
        // the inset box and its two diagonals, 8px in from the edge as in O05
        <svg viewBox={`0 0 ${size} ${height}`} preserveAspectRatio="none">
          <g fill="none" stroke="#b6c2d0" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <rect x="8.5" y="8.5" width={size - 17} height={height - 17} />
            <path d={`M8.5 8.5 L${size - 8.5} ${height - 8.5} M${size - 8.5} 8.5 L8.5 ${height - 8.5}`} />
          </g>
        </svg>
      )}
    </span>
  );
}
