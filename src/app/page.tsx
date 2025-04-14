"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    // Convert FileList to array and check total size
    const newAttachments = Array.from(selectedFiles);
    const totalSize = [...attachments, ...newAttachments].reduce((acc, file) => acc + file.size, 0);

    // Limit total attachment size to 20MB (WhatsApp's approximate limit)
    if (totalSize > 20 * 1024 * 1024) {
      toast({
        title: "Attachments too large",
        description: "Total attachment size cannot exceed 20MB",
        variant: "destructive",
      });
      return;
    }

    setAttachments(prev => [...prev, ...newAttachments]);

    toast({
      title: "Attachments added",
      description: `Added ${newAttachments.length} attachment(s)`,
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }

    // Simulate upload progress
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast({
            title: "File processed",
            description: "Your CSV file has been processed successfully",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleSendMessages = () => {
    if (!file) {
      toast({
        title: "No file processed",
        description: "Please upload and process a CSV file first",
        variant: "destructive",
      });
      return;
    }

    // Simulate sending messages
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      toast({
        title: "Messages queued",
        description: `${attachments.length > 0 ? 'Messages with attachments' : 'Messages'} have been queued for sending`,
      });
    }, 2000);
  };

  // Helper function to get file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return '🖼️';
    } else if (['pdf'].includes(extension || '')) {
      return '📄';
    } else if (['doc', 'docx'].includes(extension || '')) {
      return '📝';
    } else if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return '📊';
    } else if (['mp4', 'mov', 'avi'].includes(extension || '')) {
      return '🎬';
    } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
      return '🔊';
    } else {
      return '📎';
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-green-500 rounded-full p-3 mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-white"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                <path d="M14.5 6.5 18 10l-4 4-4-4 3.5-3.5Z" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-tight">Scalixity</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Automation</h1>
          <p className="text-muted-foreground mt-2">
            Upload your CSV file and send automated WhatsApp messages with attachments
          </p>
        </div>

        <Card className="mb-8 shadow-md">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Upload Contact List</CardTitle>
            <CardDescription>
              Upload a CSV file containing phone numbers and message templates
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label htmlFor="csv" className="text-sm font-medium leading-none mb-2">
                  CSV File
                </label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {uploading && (
                <div className="space-y-2 my-4">
                  <Progress value={uploadProgress} className="w-full h-2" />
                  <p className="text-sm text-muted-foreground">Processing file... {uploadProgress}%</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="mt-2"
              >
                {uploading ? "Processing..." : "Process CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attachments Card */}
        <Card className="mb-8 shadow-md">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Add Attachments</CardTitle>
            <CardDescription>
              Upload files to attach to your WhatsApp messages (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label htmlFor="attachments" className="text-sm font-medium leading-none mb-2">
                  Media Files
                </label>
                <Input
                  id="attachments"
                  type="file"
                  onChange={handleAttachmentChange}
                  disabled={uploading || isSending}
                  className="cursor-pointer"
                  multiple
                  accept="image/*,application/pdf,video/*,audio/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports images (JPEG, PNG), documents (PDF, DOC), videos, and audio files
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="border rounded-md p-3 mt-4">
                  <h3 className="text-sm font-medium mb-2">Uploaded Attachments</h3>
                  <ul className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">{getFileIcon(attachment.name)}</span>
                          <span className="truncate max-w-[200px]">{attachment.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-7 px-2 text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Send Messages</CardTitle>
            <CardDescription>
              Send WhatsApp messages with optional attachments to all contacts in your CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-1">CSV Format Information</h3>
              <p className="text-xs text-blue-700">
                Your CSV should include columns for: phone number, name, and message template.
                Example: +1234567890, John Doe, "Hello {name}, your appointment is confirmed."
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <p>
                {file
                  ? `Ready to send messages to contacts from ${file.name}`
                  : "Upload a CSV file to begin sending messages"}
              </p>

              {attachments.length > 0 && (
                <p className="text-sm text-green-600">
                  {attachments.length} attachment(s) will be sent with each message
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 text-xs text-yellow-700">
              <p className="font-medium">Note:</p>
              <p>WhatsApp has limits on attachment sizes and types. Large files or too many attachments may not send properly.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t">
            <Button
              onClick={handleSendMessages}
              disabled={!file || isSending || uploading}
              className="w-full"
              size="lg"
            >
              {isSending ? "Sending..." : "Send WhatsApp Messages"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
