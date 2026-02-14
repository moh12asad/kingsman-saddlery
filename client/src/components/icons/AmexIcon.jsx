export default function AmexIcon({ size = 50, className = "" }) {
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
      <title>American Express</title>
      <rect width="100" height="65" rx="4" fill="#006FCF" />
      <text
        x="50"
        y="35"
        fontSize="11"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        AMERICAN
      </text>
      <text
        x="50"
        y="48"
        fontSize="11"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        EXPRESS
      </text>
    </svg>
  );
}

