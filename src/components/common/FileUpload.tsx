import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader, FileText, File } from 'lucide-react';
import Button from './Button';
import { eventAPI } from '../../api/apiClient';

interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

interface FileUploadProps {
  onFileUploaded: (result: FileUploadResult) => void;
  eventId: string;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
  existingFiles?: {
    urls: string[];
    filenames: string[];
  };
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  result?: FileUploadResult;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  eventId,
  disabled = false,
  maxFiles = 5,
  className = '',
  existingFiles = { urls: [], filenames: [] }
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const totalExistingFiles = existingFiles.urls.length + uploadingFiles.length;
    const availableSlots = maxFiles - totalExistingFiles;
    
    if (availableSlots <= 0) {
      alert(`Maximum ${maxFiles} files allowed. You already have ${totalExistingFiles} files.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, availableSlots);
    
    selectedFiles.forEach(file => {
      const uploadId = Date.now() + Math.random().toString(36).substr(2, 9);
      
      // Add to uploading files
      const newUploadingFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading'
      };

      setUploadingFiles(prev => [...prev, newUploadingFile]);

      // Start upload
      uploadFile(uploadId, file);
    });
  };

  const uploadFile = async (uploadId: string, file: File) => {
    try {
      // Call the backend API to upload the file
      const response = await eventAPI.uploadEventAttachments(eventId, file);
      
      // Backend should return the file URLs and filename in the response
      const result: FileUploadResult = {
        success: true,
        fileUrl: response.data.fileUrl || response.data.url, // Handle different response formats
        fileName: response.data.fileName || response.data.filename || file.name, // Use backend filename if provided
      };

      // Update status to completed
      setUploadingFiles(prev => prev.map(uf => 
        uf.id === uploadId 
          ? { 
              ...uf, 
              progress: 100, 
              status: 'completed',
              result
            }
          : uf
      ));

      // Notify parent component
      onFileUploaded(result);

    } catch (error: any) {
      console.error('File upload error:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      
      setUploadingFiles(prev => prev.map(uf => 
        uf.id === uploadId 
          ? { 
              ...uf, 
              status: 'error',
              error: errorMessage
            }
          : uf
      ));
    }
  };

  const removeUploadingFile = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(uf => uf.id !== uploadId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (uploadingFile: UploadingFile) => {
    switch (uploadingFile.status) {
      case 'uploading':
        return `Uploading... ${uploadingFile.progress}%`;
      case 'completed':
        return 'Upload completed';
      case 'error':
        return uploadingFile.error || 'Upload failed';
    }
  };

  // Simple file type icon function to replace AWS service dependency
  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    } else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx') || type.includes('xls')) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else if (type.includes('word') || type.includes('document') || type.includes('docx') || type.includes('doc')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else {
      return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Simple file size formatter
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
          ${dragOver 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.doc,.txt,.csv"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Event Documents
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-sm text-gray-500">
          Supports: PDF, Excel, Word, Text files (max 10MB each)
        </p>
        
        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        )}
      </div>

      {/* Existing Files List */}
      

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileTypeIcon(uploadingFile.file.type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadingFile.status === 'completed' && uploadingFile.result?.fileName 
                        ? uploadingFile.result.fileName 
                        : uploadingFile.file.name}
                    </p>
                    {uploadingFile.status === 'completed' && uploadingFile.result?.fileName && 
                     uploadingFile.result.fileName !== uploadingFile.file.name && (
                      <p className="text-xs text-gray-500 truncate">
                        Original: {uploadingFile.file.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeUploadingFile(uploadingFile.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon(uploadingFile.status)}
                  <p className="text-xs text-gray-500">
                    {getStatusText(uploadingFile)}
                  </p>
                  <span className="text-xs text-gray-400">
                    ({formatFileSize(uploadingFile.file.size)})
                  </span>
                </div>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Upload Success Message */}
                {uploadingFile.status === 'completed' && uploadingFile.result?.fileUrl && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                    <p className="text-green-800 font-medium">✅ Upload Successful</p>
                    <p className="text-green-700 mt-1 truncate">
                      Saved as: {uploadingFile.result.fileName || 'Unknown filename'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
};

export default FileUpload;
