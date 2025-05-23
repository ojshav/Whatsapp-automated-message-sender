'use client'
import { useState, useRef, useEffect } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Button } from '../components/Button';
import { LogDisplay } from '../components/LogDisplay';
import { Toast, ToastContainer } from '../components/Toast';

interface Log {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface CampaignStatus {
  fileName: string;
  status: string;
  processed?: number;
  total?: number;
  successful?: number;
  failed?: number;
  successRate?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({
    message: '',
    type: null,
  });
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [templateName, setTemplateName] = useState<string>("scalixity_marketing_2");

  // Add a log entry
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const newLog: Log = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs((prevLogs) => [newLog, ...prevLogs]);
  };

  // Handle file selection
  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setToast({ message: 'Please upload a CSV file', type: 'error' });
      return;
    }
    setFile(selectedFile);
    addLog(`File selected: ${selectedFile.name}`, 'info');
  };

  // Send messages
  const handleSendMessages = async () => {
    if (!file) {
      setToast({ message: 'Please select a CSV file first', type: 'error' });
      return;
    }

    setIsLoading(true);
    addLog('Uploading file and starting campaign...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template_name', templateName);

      const response = await fetch('http://localhost:8000/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error sending messages');
      }

      addLog(`Campaign started: ${data.message}`, 'success');
      setToast({ message: 'Campaign started successfully', type: 'success' });
      
      // Start polling for campaign status
      startPollingStatus(file.name);
      
      setCampaignStatus({
        fileName: file.name,
        status: 'processing',
      });
    } catch (error) {
      console.error('Error:', error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      setToast({ message: 'Failed to start campaign', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for campaign status
  const startPollingStatus = (fileName: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    addLog('Checking campaign status...', 'info');
    
    // Set up polling
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/campaign-status/${encodeURIComponent(fileName)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch campaign status');
        }
        
        const data = await response.json();
        
        setCampaignStatus({
          fileName: fileName,
          status: data.status,
          processed: data.processed,
          total: data.total,
          successful: data.successful,
          failed: data.failed,
          successRate: data.success_rate
        });
        
        // Log status updates
        if (data.status === 'completed') {
          addLog(`Campaign completed. Success rate: ${data.success_rate}`, 'success');
          clearInterval(interval);
          setPollingInterval(null);
        } else if (data.processed && data.total) {
          addLog(`Progress: ${data.processed}/${data.total} contacts processed`, 'info');
        }
      } catch (error) {
        console.error('Error polling campaign status:', error);
        addLog('Error checking campaign status', 'error');
      }
    }, 5000); // Poll every 5 seconds
    
    setPollingInterval(interval);
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toast.type) {
      const timer = setTimeout(() => {
        setToast({ message: '', type: null });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="flex items-center mr-4">
            <div className="bg-green-500 rounded-full p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-white"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Scalixity WhatsApp Automation</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Upload CSV File</h2>
                  <FileUpload onFileSelected={handleFileSelected} />
                  
                  {file && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Selected file:</p>
                      <div className="flex items-center mt-1 p-2 bg-gray-50 rounded-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                      Template Name
                    </label>
                    <input
                      type="text"
                      id="templateName"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter WhatsApp template name"
                    />
                  </div>

                  <div className="mt-6">
                    <Button 
                      onClick={handleSendMessages} 
                      isLoading={isLoading} 
                      disabled={!file || isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send WhatsApp Messages'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow overflow-hidden rounded-lg mt-6">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">CSV Format Requirements</h2>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>Your CSV file should include the following columns:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Mobile (phone number with country code)</li>
                      <li>Name of the Exhibitor (company name)</li>
                      <li>Profile (company description)</li>
                      <li>Sector (industry or sector)</li>
                    </ul>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            Make sure phone numbers include the country code (e.g., +1234567890)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {campaignStatus && (
                <div className="bg-white shadow overflow-hidden rounded-lg mt-6">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Campaign Status</h2>
                    <div className="text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500">File:</span>
                        <span className="font-medium">{campaignStatus.fileName}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Status:</span>
                        <span className="font-medium">
                          {campaignStatus.status === 'processing' && (
                            <span className="text-blue-600">In Progress</span>
                          )}
                          {campaignStatus.status === 'completed' && (
                            <span className="text-green-600">Completed</span>
                          )}
                          {campaignStatus.status === 'failed' && (
                            <span className="text-red-600">Failed</span>
                          )}
                        </span>
                      </div>
                      {campaignStatus.processed !== undefined && campaignStatus.total !== undefined && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500">Progress:</span>
                          <span className="font-medium">{campaignStatus.processed} / {campaignStatus.total}</span>
                        </div>
                      )}
                      {campaignStatus.successful !== undefined && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500">Successful:</span>
                          <span className="font-medium text-green-600">{campaignStatus.successful}</span>
                        </div>
                      )}
                      {campaignStatus.failed !== undefined && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-500">Failed:</span>
                          <span className="font-medium text-red-600">{campaignStatus.failed}</span>
                        </div>
                      )}
                      {campaignStatus.successRate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Success Rate:</span>
                          <span className="font-medium">{campaignStatus.successRate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="bg-white shadow rounded-lg h-full">
                <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Activity Logs</h2>
                </div>
                <LogDisplay logs={logs} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden rounded-lg">
  <div className="px-4 py-5 sm:p-6">
    <h2 className="text-lg font-medium text-gray-900 mb-4">WhatsApp Inbox</h2>
   
  </div>
</div>
      </main>

      {toast.type && <ToastContainer>
        <Toast message={toast.message} type={toast.type} />
      </ToastContainer>}
    </div>
  );
}