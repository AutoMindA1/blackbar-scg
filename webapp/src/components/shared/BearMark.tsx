import heroImg from '../../assets/hero.png';

interface BearMarkProps {
  variant: 'icon' | 'watermark' | 'hero' | 'pulse' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'full';
  opacity?: number;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
  full: 'w-full h-full',
} as const;

export default function BearMark({ variant, size = 'md', opacity, className = '' }: BearMarkProps) {
  if (variant === 'icon') {
    return (
      <img
        src={heroImg}
        alt="BlackBar"
        className={`${sizeClasses[size]} object-cover object-[50%_25%] rounded-full ${className}`}
        style={opacity !== undefined ? { opacity } : undefined}
      />
    );
  }

  if (variant === 'hero') {
    return (
      <div
        className={`${sizeClasses[size]} ${className}`}
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          ...(opacity !== undefined ? { opacity } : {}),
        }}
      />
    );
  }

  // Watermark, pulse, glow — positioned overlay
  const variantClass = {
    watermark: 'bear-watermark',
    pulse: 'bear-pulse',
    glow: 'bear-glow',
  }[variant];

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-0 ${variantClass} ${className}`}
      style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: variant === 'glow' ? '30% auto' : variant === 'pulse' ? '40% auto' : '60% auto',
        backgroundPosition: variant === 'glow' ? 'center 40%' : 'center center',
        backgroundRepeat: 'no-repeat',
        opacity: opacity ?? (variant === 'watermark' ? 0.03 : variant === 'pulse' ? 0.05 : 0.06),
      }}
    />
  );
}
