/**
 * Enhanced Document Viewer Component
 * View uploaded documents with AI extraction results and field mapping
 */

import {
    AlertCircle,
    Brain,
    CheckCircle,
    Clock,
    Database,
    Download,
    Edit,
    Eye,
    FileText,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface DocumentViewerProps {
  documentId: number;
  onEdit?: (documentId: number) => void;
  onApprove?: (documentId: number) => void;
}

interface Document {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  entityType: string;
  entityId: number;
  status: 'uploaded' | 'processing' | 'processed' | 'approved' | 'rejected';
  extractionResults?: ExtractionResults;
}

interface ExtractionResults {
  extractedData: Record<string, any>;
  confidenceScores: Record<string, number>;
  requiresReview: string[];
  autoPopulated: string[];
  validationErrors: string[];
  processingTime: number;
  aiProvider: string;
  ocrProvider: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  onEdit,
  onApprove
}) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocume async () => {
    try {
      setLoading(true);
      // API call to fetch document details
      const response = await fetch(`/api/documents/${documentId}`);
      const data = await response.json();
      setDocument(data);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading document...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Document not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-xl">{document.fileName}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>•</span>
                  <span>Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <Badge className={getStatusColor(document.status)}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(document.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onApprove && document.status === 'processed' && (
                <Button size="sm" onClick={() => onApprove(document.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Document Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview" className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="extracted" className="flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            AI Extraction
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Field Mapping
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Processing
          </TabsTrigger>
        </TabsList>

        {/* Document Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6">
              <div className="border rounded-lg p-4 bg-gray-50 min-h-96">
                {document.fileType.startsWith('image/') ? (
                  <img
                    src={`/api/documents/${document.id}/preview`}
                    alt={document.fileName}
                    className="max-w-full h-auto"
                  />
                ) : document.fileType === 'application/pdf' ? (
                  <iframe
                    src={`/api/documents/${document.id}/preview`}
                    className="w-full h-96"
                    title={document.fileName}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4" />
                      <p>Preview not available for this file type</p>
                      <p className="text-sm">Download to view content</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Extraction Results Tab */}
        <TabsContent value="extracted">
          <Card>
            <CardHeader>
              <CardTitle>AI Extraction Results</CardTitle>
            </CardHeader>
            <CardContent>
              {document.extractionResults ? (
                <div className="space-y-6">
                  {/* Extraction Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.keys(document.extractionResults.extractedData).length}
                      </div>
                      <div className="text-sm text-blue-600">Fields Extracted</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {document.extractionResults.autoPopulated.length}
                      </div>
                      <div className="text-sm text-green-600">Auto-Populated</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {document.extractionResults.requiresReview.length}
                      </div>
                      <div className="text-sm text-yellow-600">Needs Review</div>
                    </div>
                  </div>

                  {/* Extracted Fields */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Extracted Fields</h3>
                    <div className="space-y-3">
                      {Object.entries(document.extractionResults.extractedData).map(([field, value]) => {
                        const confidence = document.extractionResults!.confidenceScores[field] || 0;
                        const needsReview = document.extractionResults!.requiresReview.includes(field);
                        const autoPopulated = document.extractionResults!.autoPopulated.includes(field);

                        return (
                          <div key={field} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{field}</span>
                                {autoPopulated && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Auto-populated
                                  </Badge>
                                )}
                                {needsReview && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Needs Review
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                                  {Math.round(confidence * 100)}%
                                </span>
                                <Progress value={confidence * 100} className="w-20" />
                              </div>
                            </div>
                            <div className="text-gray-700">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {document.extractionResults.validationErrors.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-red-600">Validation Errors</h3>
                      <div className="space-y-2">
                        {document.extractionResults.validationErrors.map((error, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                              <span className="text-red-700">{error}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No extraction results available</p>
                  <p className="text-sm">Document may not have been processed yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Field mapping visualization</p>
                <p className="text-sm">Shows how extracted fields map to database entities</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Details Tab */}
        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing Details</CardTitle>
            </CardHeader>
            <CardContent>
              {document.extractionResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">AI Provider</label>
                      <div className="text-lg">{document.extractionResults.aiProvider}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">OCR Provider</label>
                      <div className="text-lg">{document.extractionResults.ocrProvider}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Processing Time</label>
                      <div className="text-lg">{document.extractionResults.processingTime}ms</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Entity Type</label>
                      <div className="text-lg capitalize">{document.entityType}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No processing details available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
