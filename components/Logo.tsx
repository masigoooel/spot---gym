// wordmark spot.: huruf "o" diganti segi enam dengan titik oranye (SPEC §8)
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block font-extrabold tracking-[-0.06em] ${className}`}>
      sp
      <svg
        viewBox="3.5 0.5 49 55"
        aria-hidden="true"
        className="inline-block h-[0.56em] w-[0.5em] ml-[0.075em] mr-[0.02em] align-baseline"
      >
        <polygon
          points="28,4 48.8,16 48.8,40 28,52 7.2,40 7.2,16"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="28" r="6.5" fill="#FF6B35" />
      </svg>
      <span className="sr-only">o</span>
      t.
    </span>
  );
}
