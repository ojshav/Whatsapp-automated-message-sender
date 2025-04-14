// src/components/Toast.tsx
import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const bgColor = type === 'success' ? 'bg-green-50' : 'bg-red-50';
  const borderColor = type === 'success' ? 'border-green-400' : 'border-red-400';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const iconColor = type === 'success' ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`rounded-md ${bgColor} p-4 border ${borderColor}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <svg className={`h-5 w-5 ${iconColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${iconColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      {children}
    </div>
  );
};