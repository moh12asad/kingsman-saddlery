export default function MasterCardIcon({ size = 50, className = "" }) {
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
      <title>MasterCard</title>
      <circle cx="30" cy="32.5" r="20" fill="#EB001B" />
      <circle cx="70" cy="32.5" r="20" fill="#F79E1B" />
      <path
        d="M50 20.5c-6.6 0-12 5.4-12 12s5.4 12 12 12c6.6 0 12-5.4 12-12s-5.4-12-12-12zm-20 0c-6.6 0-12 5.4-12 12s5.4 12 12 12c6.6 0 12-5.4 12-12s-5.4-12-12-12z"
        fill="#FF5F00"
        opacity="0.7"
      />
    </svg>
  );
}

