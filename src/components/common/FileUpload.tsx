import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Button from './Button';
import { awsDirectService as awsService, FileUploadResult, ComprehendAnalysis } from '../../services/awsDirectService';

interface FileUploadProps {
  onFileUploaded: (result: FileUploadResult) => void;
  eventId: string;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'analyzing' | 'completed' | 'error';
  result?: FileUploadResult;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  eventId,
  disabled = false,
  maxFiles = 5,
  className = ''
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files).slice(0, maxFiles - uploadingFiles.length);
    
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
      const result = await awsService.uploadAndAnalyzeFile(
        file,
        eventId,
        (progress) => {
          setUploadingFiles(prev => prev.map(uf => 
            uf.id === uploadId 
              ? { 
                  ...uf, 
                  progress, 
                  status: progress < 70 ? 'uploading' : 'analyzing' 
                }
              : uf
          ));
        }
      );

      // Update status
      setUploadingFiles(prev => prev.map(uf => 
        uf.id === uploadId 
          ? { 
              ...uf, 
              progress: 100, 
              status: result.success ? 'completed' : 'error',
              result,
              error: result.error
            }
          : uf
      ));

      // Notify parent component
      if (result.success) {
        onFileUploaded(result);
      }

    } catch (error: any) {
      setUploadingFiles(prev => prev.map(uf => 
        uf.id === uploadId 
          ? { 
              ...uf, 
              status: 'error',
              error: error.message || 'Upload failed'
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
      case 'analyzing':
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
      case 'analyzing':
        return 'Analyzing content...';
      case 'completed':
        return 'Upload completed';
      case 'error':
        return uploadingFile.error || 'Upload failed';
    }
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
                {awsService.getFileTypeIcon(uploadingFile.file.type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
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
                    ({awsService.formatFileSize(uploadingFile.file.size)})
                  </span>
                </div>

                {/* Progress Bar */}
                {(uploadingFile.status === 'uploading' || uploadingFile.status === 'analyzing') && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Analysis Results Preview */}
                {uploadingFile.status === 'completed' && uploadingFile.result?.analysisResult && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-blue-800 font-medium">Analysis Complete:</p>
                    <p className="text-blue-700 mt-1">
                      {(uploadingFile.result.analysisResult as ComprehendAnalysis).summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Limits Info */}
      {uploadingFiles.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {uploadingFiles.length} / {maxFiles} files uploaded
        </div>
      )}
    </div>
  );
};

export default FileUpload;
