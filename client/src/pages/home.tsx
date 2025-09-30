import { useState } from "react";
import { Camera, Edit, Scan, History, Zap, TrendingUp, Shield, Clock, Star, ArrowRight, Sparkles, Activity, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ManualInput } from "@/components/manual-input";
import { AnalysisResults } from "@/components/analysis-results";
import { DoctorConsultation } from "@/components/doctor-consultation";
import { AIChatbot, AIChatbotButton } from "@/components/ai-chatbot";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, cacheConfig } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ScanHistory } from "@shared/schema";

export default function Home() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [doctorConsultationOpen, setDoctorConsultationOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanHistory | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get recent scans with optimized caching
  const { data: scansResponse, isLoading: scansLoading } = useQuery({
    queryKey: ['/api/scans'],
    enabled: !!user,
    ...cacheConfig.scanHistory, // Use optimized scan history cache
  });

  // Extract scans array from response (handle both old and new API format)
  const recentScans = Array.isArray(scansResponse) ? scansResponse : ((scansResponse as any)?.scans || []);

  // Calculate statistics
  const totalScans = recentScans.length;
  const safeScans = recentScans.filter((scan: any) => scan.analysisResult?.safe).length;
  const safetyRate = totalScans > 0 ? Math.round((safeScans / totalScans) * 100) : 0;
  const recentScansList = recentScans.slice(0, 3);

  // Barcode scan mutation
  const barcodeScanMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await apiRequest('POST', '/api/scan/barcode', {
        barcode
      });
      if (!response) {
        throw new Error('Failed to scan barcode');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResult(data.scan);
      setScannerOpen(false);
      setResultsOpen(true);

      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Scan completed",
        description: `Analysis: ${data.analysisResult.safe ? 'Safe to consume' : 'Caution advised'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan failed",
        description: error.message || "Failed to analyze barcode",
        variant: "destructive",
      });
    }
  });

  // Manual analysis mutation
  const manualAnalysisMutation = useMutation({
    mutationFn: async (data: { productName?: string; ingredients: string }) => {
      const response = await apiRequest('POST', '/api/scan/manual', data);
      if (!response) {
        throw new Error('Failed to analyze ingredients');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResult(data.scan);
      setManualInputOpen(false);
      setResultsOpen(true);

      queryClient.invalidateQueries({ queryKey: ['/api/scans'] });
      toast({
        title: "Analysis completed",
        description: `Result: ${data.analysisResult.safe ? 'Safe to consume' : 'Caution advised'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze ingredients",
        variant: "destructive",
      });
    }
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown date';
    const scanDate = new Date(date);
    return scanDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe': return 'text-green-600 bg-green-50 border-green-200';
      case 'caution': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-full border border-blue-200 dark:border-blue-800">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI-Powered Food Safety</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Scan, analyze, and stay safe with intelligent food allergy detection powered by AI
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Scans</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{totalScans}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Scan className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Safety Rate</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{safetyRate}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <Progress value={safetyRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">This Week</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{Math.min(totalScans, 12)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold flex items-center justify-center space-x-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            <span>Quick Scan</span>
          </CardTitle>
          <p className="text-muted-foreground">Choose your preferred scanning method</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Button
            size="lg"
            onClick={() => setScannerOpen(true)}
            className="h-24 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <div className="flex flex-col items-center space-y-2">
              <Camera className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Scan Barcode</div>
                <div className="text-sm opacity-90">Use camera to scan</div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setManualInputOpen(true)}
            className="h-24 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <div className="flex flex-col items-center space-y-2">
              <Edit className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Manual Entry</div>
                <div className="text-sm text-muted-foreground">Type ingredients</div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Scans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Recent Scans</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Your latest food safety analyses</p>
          </div>
          <Link href="/history">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentScansList.length > 0 ? (
            <div className="space-y-3">
              {recentScansList.map((scan: any) => (
                <div key={scan.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    scan.analysisResult?.safe
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {scan.analysisResult?.safe ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {scan.productName || 'Manual Entry'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`${getRiskColor(scan.analysisResult?.riskLevel || 'unknown')} text-xs`}
                      >
                        {scan.analysisResult?.riskLevel || 'Unknown'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(scan.scannedAt)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scan className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">No scans yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Start by scanning your first food item</p>
              <Button onClick={() => setScannerOpen(true)} className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Tips */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Daily Health Tip</h3>
              <p className="text-orange-800 dark:text-orange-200 text-sm leading-relaxed">
                Always read ingredient labels carefully, even for familiar products. Manufacturers may change formulations without notice,
                potentially introducing new allergens. When in doubt, contact the manufacturer directly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(barcode) => barcodeScanMutation.mutate(barcode)}
        onManualInput={() => {
          setScannerOpen(false);
          setManualInputOpen(true);
        }}
      />

      <ManualInput
        isOpen={manualInputOpen}
        onClose={() => setManualInputOpen(false)}
        onAnalyze={(data) => manualAnalysisMutation.mutate(data)}
      />

      {currentResult && (
        <AnalysisResults
          isOpen={resultsOpen}
          onClose={() => {
            setResultsOpen(false);
            setCurrentResult(null);
          }}
          result={currentResult}
          onSave={() => {}}
          onShare={() => {}}
          onConsultDoctor={() => {
            setResultsOpen(false);
            setDoctorConsultationOpen(true);
          }}
        />
      )}

      <AIChatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      <DoctorConsultation
        isOpen={doctorConsultationOpen}
        onClose={() => setDoctorConsultationOpen(false)}
        scanResult={currentResult}
      />

      <AIChatbotButton onClick={() => setChatbotOpen(true)} />
      </div>
    </div>
  );
}