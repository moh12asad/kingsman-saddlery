export default function VisaIcon({ size = 50, className = "" }) {
  const height = size * 0.3;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 30"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Visa</title>
      <path
        d="M40.4 21.2h-5.1l3.1-19.2h5.1l-3.1 19.2zm15.1 0h-4.4l2.5-19.2h4.4l-2.5 19.2zm13.5-19.2l-3.7 19.2h-4.7l3.7-19.2h4.7zm-11.3 0l-5.8 14.1-0.6-3.1c-1-3.4-4.1-7.1-7.6-8.9l4.9 18h-5.1l3.1-19.2h7.1c0.9 0 1.7 0.5 2 1.3l1.1 5.7zm-30.1 0l-7.2 13.3-0.8-6.6c-0.1-1.1-1-1.9-2.1-1.9h-10.1l-0.1 0.6c7.8 1.9 13 5.1 15.4 9.4l-2.6 12.6h5.1l7.4-19.2h-5.1z"
        fill="#1434CB"
      />
    </svg>
  );
}

