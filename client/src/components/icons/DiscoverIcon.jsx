export default function DiscoverIcon({ size = 50, className = "" }) {
  const height = size * 0.65;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 65"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Discover</title>
      <rect width="100" height="65" rx="4" fill="#FF6000" />
      <circle cx="50" cy="32.5" r="15" fill="none" stroke="white" strokeWidth="2" />
      <text
        x="50"
        y="38"
        fontSize="13"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        DISCOVER
      </text>
    </svg>
  );
}

