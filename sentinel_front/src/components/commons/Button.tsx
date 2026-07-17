// src/ui/components/Button.tsx
import { useTheme } from '../../utils/store/themeContext';
import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  text: string;
  url?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  pill?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  text,
  url,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  fullWidth = false,
  icon,
  iconPosition = 'right',
  pill = false,
}) => {
  const { theme, mode } = useTheme();

  const getColorByVariant = (variant: string): string => {
    const colorMap: Record<string, string> = {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      success: theme.colors.success,
      danger: theme.colors.danger,
      warning: theme.colors.warning,
      info: theme.colors.info,
    };
    return colorMap[variant] || theme.colors.primary;
  };

  const getSizeStyles = (size: string) => {
    const sizeMap: Record<string, { padding: string; fontSize: string }> = {
      small: { padding: '3px 3px', fontSize: '12px' },
      medium: { padding: '5px 2px 5px 15px', fontSize: '12px' },
      large: { padding: '10px 10px', fontSize: '16px' },
    };
    return sizeMap[size] || sizeMap.medium;
  };

  const color = getColorByVariant(variant);
  const sizeStyles = getSizeStyles(size);

  // Use variant color for button background, theme-aware text/icon colors
  const buttonColor = color;
  const iconCircleColor = mode === 'dark' ? theme.colors.primary : 'var(--color-text-primary)';
  const textColor = mode === 'dark' ? theme.colors.primary : 'var(--color-text-primary)';

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    border: 'none',
    backgroundColor: buttonColor,
    color: textColor,
    fontSize: sizeStyles.fontSize,
    borderRadius: pill ? '50px' : '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    letterSpacing: '0.5px',
    transition: 'all 0.3s ease',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    textDecoration: 'none',
    justifyContent: 'center',
  };

  const iconStyle: React.CSSProperties = {
    width: '37px',
    height: '37px',
    borderRadius: '50%',
    margin: '2px',
    backgroundColor: iconCircleColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: buttonColor,
    fontSize: '12px',
    fontWeight: 'bold',
  };
  
  const textStyle: React.CSSProperties={
    padding: sizeStyles.padding,
  }

  const buttonContent = (
    <>
      {icon && iconPosition === 'left' && <span style={iconStyle}>{icon}</span>}
      <span style={textStyle}>{text}</span>
      {icon && iconPosition === 'right' && <span style={iconStyle}>{icon}</span>}
    </>
  );

  const hoverEffect = !disabled ? {
    scale: 1.05,
    boxShadow: `0 0 20px ${color}66`,
  } : {};

  // Si tiene URL, renderiza como link
  if (url) {
    return (
      <motion.a
        href={url}
        style={baseStyles}
        whileHover={hoverEffect}
        transition={{ duration: 0.2 }}
        className="sentinel-button"
      >
        {buttonContent}
      </motion.a>
    );
  }

  // Si no tiene URL, renderiza como button
  return (
    <motion.button
      style={baseStyles}
      disabled={disabled}
      onClick={onClick}
      whileHover={hoverEffect}
      transition={{ duration: 0.2 }}
      className="sentinel-button"
    >
      {buttonContent}
    </motion.button>
  );
};