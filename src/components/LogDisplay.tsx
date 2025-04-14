// src/components/LogDisplay.tsx
import React, { useEffect, useRef } from 'react';

interface Log {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface LogDisplayProps {
  logs: Log[];
}

export const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogTypeStyles = (type: Log['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'error':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'warning':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      default:
        return 'text-blue-800 bg-blue-50 border-blue-100';
    }
  };

  const getLogIcon = (type: Log['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div 
      ref={scrollContainerRef} 
      className="px-4 py-4 sm:px-6 h-[500px] overflow-y-auto"
    >
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No activity logs yet</p>
          <p className="text-sm mt-2">Upload a CSV file and start a campaign to see logs</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li 
              key={log.id} 
              className={`flex items-start p-3 border rounded-md ${getLogTypeStyles(log.type)}`}
            >
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{log.type.charAt(0).toUpperCase() + log.type.slice(1)}</p>
                  <span className="text-xs">{log.timestamp}</span>
                </div>
                <p className="text-sm mt-1 break-words">{log.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
