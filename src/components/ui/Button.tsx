import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'forest' | 'olive' | 'coral' | 'ghost' | 'outline' | 'light';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  const variantStyles = {
    primary:
      'bg-[#4A6B53] hover:bg-[#3D5A44] text-[#FAF7F0] focus:ring-[#4A6B53] shadow-sm hover:shadow',
    forest:
      'bg-[#2D4A36] hover:bg-[#1E3525] text-[#F5F2EB] focus:ring-[#2D4A36] shadow-sm hover:shadow',
    secondary:
      'bg-[#F5F0E6] hover:bg-[#EAE4D6] text-[#292524] border border-[#DDD5C5] focus:ring-[#C4BAA3]',
    light:
      'bg-white hover:bg-[#FAF7F0] text-[#1E3525] font-semibold border border-[#D5CDC0] shadow-xs focus:ring-[#4A6B53]',
    olive:
      'bg-[#606C38] hover:bg-[#4E582E] text-[#FAF7F0] focus:ring-[#606C38]',
    coral:
      'bg-[#DC2626] hover:bg-[#B91C1C] text-white focus:ring-[#DC2626] shadow-sm',
    ghost:
      'bg-transparent hover:bg-[#EFE9DC] text-[#44403C] hover:text-[#1C1917] focus:ring-[#DDD5C5]',
    outline:
      'bg-transparent border border-[#DDD5C5] hover:bg-[#F5F0E6] text-[#292524] focus:ring-[#4A6B53]',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.2 gap-2',
    lg: 'text-base px-5 py-2.8 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
