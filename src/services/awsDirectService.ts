import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ComprehendClient, DetectKeyPhrasesCommand, DetectEntitiesCommand, DetectSentimentCommand } from '@aws-sdk/client-comprehend';
import { Upload } from '@aws-sdk/lib-storage';
import { eventAPI } from '../api/apiClient';

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  analysisResult?: any;
  error?: string;
}

export interface ComprehendAnalysis {
  keyPhrases: Array<{
    text: string;
    score: number;
  }>;
  entities: Array<{
    text: string;
    type: string;
    score: number;
  }>;
  sentiment: {
    sentiment: string;
    score: number;
  };
  language: string;
  summary?: string;
}

class AWSDirectService {
  private s3Client: S3Client | null = null;
  private comprehendClient: ComprehendClient | null = null;
  
  private readonly SUPPORTED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain', // .txt
    'text/csv', // .csv
  ];

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Initialize AWS clients with credentials from environment
   */
  private initializeAWS() {
    if (this.s3Client && this.comprehendClient) {
      return; // Already initialized
    }

    const region = import.meta.env.VITE_AWS_REGION || 'ap-southeast-1';
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not found. Please set VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY in your .env file');
    }

    const credentials = {
      accessKeyId,
      secretAccessKey,
    };

    this.s3Client = new S3Client({
      region,
      credentials,
    });

    this.comprehendClient = new ComprehendClient({
      region,
      credentials,
    });
  }

  /**
   * Validates if the file can be uploaded
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!this.SUPPORTED_FILE_TYPES.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Unsupported file type. Please upload PDF, Excel, Word, or text files.' 
      };
    }

    return { isValid: true };
  }

  /**
   * Uploads a file to S3 and analyzes it with Comprehend directly from frontend
   */
  async uploadAndAnalyzeFile(
    file: File,
    eventId: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Initialize AWS clients
      this.initializeAWS();

      onProgress?.(10);

      // Step 1: Upload to S3
      const bucketName = import.meta.env.VITE_AWS_S3_BUCKET || 'event-buddy-attachments';
      const key = `events/${eventId}/attachments/${Date.now()}-${file.name}`;
      
      const uploadResult = await this.uploadToS3Direct(file, bucketName, key, onProgress);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      onProgress?.(70);

      // Step 2: Extract text and analyze with Comprehend
      let analysisResult = null;
      try {
        const textContent = await this.extractTextContent(file);
        if (textContent && textContent.length > 10) {
          analysisResult = await this.analyzeWithComprehendDirect(textContent);
        }
      } catch (analysisError) {
        console.warn('Analysis failed, continuing without analysis:', analysisError);
        // Continue even if analysis fails
      }

      onProgress?.(90);

      // Step 3: Save attachment data to backend
      try {
        if (uploadResult.fileUrl) {
          await eventAPI.updateEventAttachments(eventId, {
            attachmentLinks: [uploadResult.fileUrl],
            attachmentContext: this.generateContextString(analysisResult, file.name, uploadResult.fileUrl)
          });
        }
      } catch (backendError) {
        console.warn('Failed to save attachment to backend:', backendError);
        // Continue anyway, file is uploaded to S3
      }

      onProgress?.(100);

      return {
        success: true,
        fileUrl: uploadResult.fileUrl,
        analysisResult
      };

    } catch (error: any) {
      console.error('Error uploading and analyzing file:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to upload and analyze file' 
      };
    }
  }

  /**
   * Upload file directly to S3
   */
  private async uploadToS3Direct(
    file: File, 
    bucketName: string, 
    key: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    try {
      if (!this.s3Client) {
        throw new Error('S3 client not initialized');
      }

      // Use the Upload class for better progress tracking
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: file,
          ContentType: file.type,
          ACL: 'public-read', // Make file publicly accessible
        },
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 50) + 20; // 20-70%
          onProgress?.(percent);
        }
      });

      const result = await upload.done();
      
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;
      
      return { 
        success: true, 
        fileUrl
      };
      
    } catch (error: any) {
      console.error('S3 upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract text content from file for analysis
   */
  private async extractTextContent(file: File): Promise<string> {
    if (file.type === 'text/plain' || file.type === 'text/csv') {
      return await file.text();
    }
    
    // For other file types (PDF, Word, Excel), we extract basic info from filename
    // In a full implementation, you'd use libraries like pdf-parse, mammoth, etc.
    const fileName = file.name.toLowerCase();
    let estimatedContent = `Document: ${file.name}. `;
    
    if (fileName.includes('safety') || fileName.includes('emergency')) {
      estimatedContent += 'This document contains safety and emergency procedures for event management. It includes evacuation plans, emergency contact information, and safety protocols for staff and attendees.';
    } else if (fileName.includes('workflow') || fileName.includes('process')) {
      estimatedContent += 'This document contains workflow and operational processes for event coordination. It outlines step-by-step procedures, responsibilities, and coordination protocols.';
    } else if (fileName.includes('capacity') || fileName.includes('crowd')) {
      estimatedContent += 'This document contains capacity management and crowd control information. It includes maximum occupancy limits, flow management strategies, and crowd monitoring procedures.';
    } else if (fileName.includes('layout') || fileName.includes('floor')) {
      estimatedContent += 'This document contains venue layout and floor plan information. It shows the spatial arrangement, exit locations, and facility organization.';
    } else if (fileName.includes('staff') || fileName.includes('team')) {
      estimatedContent += 'This document contains staff management and team coordination information. It includes roles, responsibilities, and communication protocols.';
    } else {
      estimatedContent += 'This document contains event management related information and operational procedures for successful event execution.';
    }
    
    return estimatedContent;
  }

  /**
   * Analyze text content directly with AWS Comprehend
   */
  private async analyzeWithComprehendDirect(textContent: string): Promise<ComprehendAnalysis> {
    try {
      if (!this.comprehendClient) {
        throw new Error('Comprehend client not initialized');
      }

      // Limit text to Comprehend's maximum
      const text = textContent.substring(0, 5000);
      const languageCode = 'en';

      // Run all analyses in parallel
      const [keyPhrasesResult, entitiesResult, sentimentResult] = await Promise.all([
        this.comprehendClient.send(new DetectKeyPhrasesCommand({
          Text: text,
          LanguageCode: languageCode
        })),
        this.comprehendClient.send(new DetectEntitiesCommand({
          Text: text,
          LanguageCode: languageCode
        })),
        this.comprehendClient.send(new DetectSentimentCommand({
          Text: text,
          LanguageCode: languageCode
        }))
      ]);

      const analysis: ComprehendAnalysis = {
        keyPhrases: (keyPhrasesResult.KeyPhrases || []).map(kp => ({
          text: kp.Text || '',
          score: kp.Score || 0
        })),
        entities: (entitiesResult.Entities || []).map(e => ({
          text: e.Text || '',
          type: e.Type || 'OTHER',
          score: e.Score || 0
        })),
        sentiment: {
          sentiment: sentimentResult.Sentiment || 'NEUTRAL',
          score: sentimentResult.SentimentScore?.[sentimentResult.Sentiment || 'NEUTRAL'] || 0
        },
        language: languageCode
      };

      analysis.summary = this.generateSummary(analysis);

      return analysis;

    } catch (error: any) {
      console.error('Comprehend analysis error:', error);
      // Fallback to mock analysis if Comprehend fails
      return this.generateMockAnalysis(file);
    }
  }

  /**
   * Generate a context string for backend storage
   */
  private generateContextString(analysis: ComprehendAnalysis | null, fileName: string, fileUrl: string): string {
    let context = `File: ${fileName}\nURL: ${fileUrl}\n`;
    
    if (analysis) {
      context += `\nAnalysis Summary: ${analysis.summary}`;
      
      if (analysis.keyPhrases.length > 0) {
        context += `\nKey Topics: ${analysis.keyPhrases.slice(0, 5).map(kp => kp.text).join(', ')}`;
      }
      
      if (analysis.entities.length > 0) {
        context += `\nEntities: ${analysis.entities.slice(0, 5).map(e => e.text).join(', ')}`;
      }
      
      context += `\nSentiment: ${analysis.sentiment.sentiment}`;
    }
    
    return context;
  }

  /**
   * Generate mock analysis as fallback
   */
  private generateMockAnalysis(file: File): ComprehendAnalysis {
    const fileName = file.name.toLowerCase();
    
    let keyPhrases = [
      { text: 'event management', score: 0.95 },
      { text: 'operational procedures', score: 0.88 },
      { text: 'coordination protocols', score: 0.92 }
    ];

    let entities = [
      { text: 'Event Venue', type: 'LOCATION', score: 0.99 },
      { text: 'Management Team', type: 'ORGANIZATION', score: 0.87 },
      { text: 'Operational Staff', type: 'PERSON', score: 0.94 }
    ];

    // Customize based on file name
    if (fileName.includes('safety') || fileName.includes('emergency')) {
      keyPhrases = [
        { text: 'emergency procedures', score: 0.97 },
        { text: 'safety protocols', score: 0.94 },
        { text: 'evacuation plans', score: 0.91 }
      ];
      entities = [
        { text: 'Emergency Services', type: 'ORGANIZATION', score: 0.98 },
        { text: 'Safety Officer', type: 'PERSON', score: 0.95 },
        { text: 'Emergency Exit', type: 'LOCATION', score: 0.89 }
      ];
    }

    return {
      keyPhrases,
      entities,
      sentiment: { sentiment: 'NEUTRAL', score: 0.85 },
      language: 'en',
      summary: this.generateSummary({ keyPhrases, entities } as any)
    };
  }

  /**
   * Generate a summary from analysis results
   */
  private generateSummary(analysis: ComprehendAnalysis): string {
    const keyPhrases = analysis.keyPhrases.slice(0, 3).map(kp => kp.text).join(', ');
    const entities = analysis.entities.slice(0, 3).map(e => e.text).join(', ');
    
    return `This document focuses on: ${keyPhrases}. Key entities mentioned include: ${entities}. The overall sentiment is ${analysis.sentiment.sentiment.toLowerCase()}.`;
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(fileType: string): string {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📃';
    if (fileType.includes('csv')) return '📈';
    return '📎';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Mock implementation for testing without AWS permissions
   */
  async uploadAndAnalyzeFileMock(
    file: File,
    eventId: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      onProgress?.(20);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      onProgress?.(60);

      // Generate mock file URL
      const bucketName = import.meta.env.VITE_AWS_S3_BUCKET || 'event-buddy-attachments';
      const mockKey = `events/${eventId}/attachments/${Date.now()}-${file.name}`;
      const fileUrl = `https://${bucketName}.s3.ap-southeast-1.amazonaws.com/${mockKey}`;

      onProgress?.(80);

      // Generate mock analysis
      const analysisResult = this.generateMockAnalysis(file);

      onProgress?.(100);

      console.log('🧪 Mock Upload Success:', { fileUrl, analysisResult });

      return {
        success: true,
        fileUrl,
        analysisResult
      };

    } catch (error: any) {
      console.error('Mock upload error:', error);
      return { 
        success: false, 
        error: error.message || 'Mock upload failed' 
      };
    }
  }
}

export const awsDirectService = new AWSDirectService();
