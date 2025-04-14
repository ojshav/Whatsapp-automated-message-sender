// src/components/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
}) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 w-full";
  
  const variantClasses = {
    primary: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
  };
  
  const disabledClasses = "opacity-50 cursor-not-allowed";
  
  return (
    <button
      type="button"
      className={`
        ${baseClasses} 
        ${variantClasses[variant]}
        ${(disabled || isLoading) ? disabledClasses : ''}
      `}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};


