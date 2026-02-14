export default function IsracardIcon({ size = 50, className = "" }) {
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
      <title>Isracard</title>
      <rect width="100" height="65" rx="4" fill="#003087" />
      <text
        x="50"
        y="38"
        fontSize="18"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        ISRACARD
      </text>
    </svg>
  );
}

