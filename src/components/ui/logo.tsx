import logoImage from '../../assets/logo.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'size-12',
    md: 'size-16',
    lg: 'size-24',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={logoImage}
        alt="D'Sierra Painting"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
