interface LogoProps {
  className?: string;
}

/** Monogramme VYRO (même tracé que l'icône de l'application). */
export function LogoMark({ className = 'size-9' }: LogoProps) {
  return (
    <svg viewBox="136 150 240 222" className={className} aria-hidden>
      <defs>
        <linearGradient id="vyro-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb0ff" />
          <stop offset="1" stopColor="#1f5eff" />
        </linearGradient>
      </defs>
      <path d="M136 150h80l40 140 40-140h80l-86 222h-68z" fill="url(#vyro-mark)" />
    </svg>
  );
}
