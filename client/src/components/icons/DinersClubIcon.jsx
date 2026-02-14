export default function DinersClubIcon({ size = 50, className = "" }) {
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
      <title>Diners Club</title>
      <rect width="100" height="65" rx="4" fill="#0079BE" />
      <circle cx="35" cy="32.5" r="12" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="65" cy="32.5" r="12" fill="none" stroke="white" strokeWidth="2" />
      <text
        x="50"
        y="38"
        fontSize="11"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        DINERS
      </text>
    </svg>
  );
}

