import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Brain, Zap, CheckCircle, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MLStatus {
  success: boolean;
  metrics?: {
    isLoaded: boolean;
    vocabularySize: number;
    allergenVocabularySize: number;
    medicationVocabularySize: number;
    total_scans: number;
    safe_scans: number;
    caution_scans: number;
    danger_scans: number;
    safeRatio: number;
    cautionRatio: number;
    dangerRatio: number;
  };
}

interface TrainingResult {
  success: boolean;
  message: string;
  trainingStats?: {
    trainingTime: number;
    totalSamples: number;
    realSamples: number;
    syntheticSamples: number;
    vocabularySize: number;
    allergenVocabularySize: number;
    medicationVocabularySize: number;
    validationIssues: string[];
    recommendations: string[];
  };
}

interface ValidationResult {
  success: boolean;
  message: string;
  performance?: {
    accuracy: number;
    averageConfidence: number;
    totalTestSamples: number;
    correctPredictions: number;
    predictionDetails: Array<{
      expected: string;
      predicted: string;
      confidence: number;
      ingredients: string[];
    }>;
  };
}

export function MLTrainingPanel() {
  const [isTraining, setIsTraining] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch ML status
  const { data: mlStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<MLStatus>({
    queryKey: ['ml-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ml/status');
      if (!response) {
        throw new Error('Failed to fetch ML status');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Training mutation
  const trainMutation = useMutation<TrainingResult, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ml/train');
      if (!response) {
        throw new Error('Failed to train model');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-status'] });
    },
  });

  // Validation mutation
  const validateMutation = useMutation<ValidationResult, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ml/validate');
      if (!response) {
        throw new Error('Failed to validate model');
      }
      return response.json();
    },
  });

  // Retrain mutation
  const retrainMutation = useMutation<TrainingResult, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ml/retrain');
      if (!response) {
        throw new Error('Failed to retrain model');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-status'] });
    },
  });

  const handleTrain = async () => {
    setIsTraining(true);
    try {
      await trainMutation.mutateAsync();
    } finally {
      setIsTraining(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateMutation.mutateAsync();
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetrain = async () => {
    setIsTraining(true);
    try {
      await retrainMutation.mutateAsync();
    } finally {
      setIsTraining(false);
    }
  };

  const metrics = mlStatus?.metrics;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Model Status
          </CardTitle>
          <CardDescription>
            Monitor and manage your machine learning model for ingredient analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading ML status...</span>
            </div>
          ) : (
            <>
              {/* Model Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Model Status:</span>
                  {metrics?.isLoaded ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Loaded
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Trained
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStatus()}
                  disabled={statusLoading}
                  title="Refresh ML Status"
                >
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Training Data Stats */}
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{metrics.total_scans}</div>
                    <div className="text-sm text-gray-600">Total Scans</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.vocabularySize}</div>
                    <div className="text-sm text-gray-600">Ingredients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{metrics.allergenVocabularySize}</div>
                    <div className="text-sm text-gray-600">Allergens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{metrics.medicationVocabularySize}</div>
                    <div className="text-sm text-gray-600">Medications</div>
                  </div>
                </div>
              )}

              {/* Data Distribution */}
              {metrics && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">Data Distribution</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Safe</span>
                      <span>{metrics.safeRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.safeRatio} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Caution</span>
                      <span>{metrics.cautionRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.cautionRatio} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Danger</span>
                      <span>{metrics.dangerRatio.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.dangerRatio} className="h-2" />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Training Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Model Training
          </CardTitle>
          <CardDescription>
            Train, validate, and retrain your ML model with current data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTrain}
              disabled={isTraining || trainMutation.isPending}
              className="flex items-center gap-2"
            >
              {isTraining || trainMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {trainMutation.isPending ? 'Training...' : 'Train Model'}
            </Button>

            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={isValidating || validateMutation.isPending || !metrics?.isLoaded}
              className="flex items-center gap-2"
            >
              {isValidating || validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {validateMutation.isPending ? 'Validating...' : 'Validate Model'}
            </Button>

            <Button
              variant="outline"
              onClick={handleRetrain}
              disabled={isTraining || retrainMutation.isPending || !metrics?.isLoaded}
              className="flex items-center gap-2"
            >
              {isTraining || retrainMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {retrainMutation.isPending ? 'Retraining...' : 'Retrain Model'}
            </Button>
          </div>

          {/* Training Results */}
          {trainMutation.data && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{trainMutation.data.message}</div>
                {trainMutation.data.trainingStats && (
                  <div className="mt-2 text-sm space-y-1">
                    <div>Training Time: {(trainMutation.data.trainingStats.trainingTime / 1000).toFixed(1)}s</div>
                    <div>Total Samples: {trainMutation.data.trainingStats.totalSamples}</div>
                    <div>Real Samples: {trainMutation.data.trainingStats.realSamples}</div>
                    <div>Synthetic Samples: {trainMutation.data.trainingStats.syntheticSamples}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Results */}
          {validateMutation.data && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{validateMutation.data.message}</div>
                {validateMutation.data.performance && (
                  <div className="mt-2 text-sm space-y-1">
                    <div>Accuracy: {validateMutation.data.performance.accuracy.toFixed(1)}%</div>
                    <div>Average Confidence: {(validateMutation.data.performance.averageConfidence * 100).toFixed(1)}%</div>
                    <div>Test Samples: {validateMutation.data.performance.totalTestSamples}</div>
                    <div>Correct Predictions: {validateMutation.data.performance.correctPredictions}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Messages */}
          {(trainMutation.error || validateMutation.error || retrainMutation.error) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {trainMutation.error?.message || 
                 validateMutation.error?.message || 
                 retrainMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ML Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>ML vs LLM Analysis</CardTitle>
          <CardDescription>
            Benefits of using machine learning for ingredient analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">ML Analysis</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Ultra-fast response (&lt;100ms)</li>
                <li>• Zero ongoing costs</li>
                <li>• Complete offline capability</li>
                <li>• No rate limits</li>
                <li>• Full data privacy</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">LLM Analysis</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• High accuracy for complex cases</li>
                <li>• Contextual understanding</li>
                <li>• Natural language explanations</li>
                <li>• Handles edge cases well</li>
                <li>• No training data needed</li>
              </ul>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-sm text-gray-600">
            <strong>Hybrid Approach:</strong> The system automatically uses ML for fast, confident predictions 
            and falls back to LLM for complex cases or when ML confidence is low.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
