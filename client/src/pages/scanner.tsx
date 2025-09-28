import { useState } from "react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ManualInput } from "@/components/manual-input";
import { AnalysisResults } from "@/components/analysis-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Edit, History, Zap, Scan, FileText, QrCode, Clock, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScanHistory } from "@shared/schema";

export default function Scanner() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanHistory | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleBarcodeScanned = (barcode: string) => {
    barcodeScanMutation.mutate(barcode);
  };

  const handleManualAnalysis = (data: { productName?: string; ingredients: string }) => {
    manualAnalysisMutation.mutate(data);
  };

  const handleSaveResult = () => {
    toast({
      title: "Saved",
      description: "Scan result saved to your history",
    });
  };

  const handleShareResult = () => {
    if (navigator.share && currentResult) {
      navigator.share({
        title: 'AllergyGuard Scan Result',
        text: `Scanned ${currentResult.productName || 'Unknown Product'} - ${currentResult.analysisResult.safe ? 'Safe' : 'Caution advised'}`,
      });
    } else {
      toast({
        title: "Share",
        description: "Share functionality would be implemented here",
      });
    }
  };

  const handleConsultDoctor = () => {
    toast({
      title: "Doctor Consultation",
      description: "This would open doctor consultation booking",
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-full border border-green-200 dark:border-green-800">
          <Sparkles className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">AI-Powered Food Safety</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-green-800 to-emerald-800 dark:from-gray-100 dark:via-green-300 dark:to-emerald-300 bg-clip-text text-transparent">
            Smart Food Scanner
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Scan barcodes or enter ingredients manually to get instant allergen and drug interaction analysis
          </p>
        </div>
      </div>

      {/* Scanning Options */}
      <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold flex items-center justify-center space-x-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            <span>Choose Scanning Method</span>
          </CardTitle>
          <p className="text-muted-foreground">Select your preferred way to analyze food safety</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Barcode Scanner */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Camera className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-green-900 dark:text-green-100">Scan Barcode</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-6">
                Point your camera at the product barcode for instant ingredient analysis powered by AI
              </p>
              <Button
                onClick={() => setScannerOpen(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={barcodeScanMutation.isPending}
                data-testid="button-open-barcode-scanner"
              >
                {barcodeScanMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Scanning...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <QrCode className="mr-3" size={20} />
                    Start Barcode Scan
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Edit className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-blue-900 dark:text-blue-100">Manual Entry</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-6">
                Type in ingredients for homemade foods or when barcodes aren't available
              </p>
              <Button
                onClick={() => setManualInputOpen(true)}
                variant="outline"
                size="lg"
                className="w-full border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-all duration-200"
                disabled={manualAnalysisMutation.isPending}
                data-testid="button-open-manual-input"
              >
                {manualAnalysisMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Analyzing...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FileText className="mr-3" size={20} />
                    Enter Manually
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Quick Access</span>
          </CardTitle>
          <p className="text-muted-foreground">Manage your scan history and profile settings</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/history">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <History className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">View Scan History</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">See all your previous scans and results</p>
                  </div>
                  <CheckCircle className="text-purple-500" size={20} />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile">
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Scan className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Update Profile</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Manage your allergies and medications</p>
                  </div>
                  <AlertTriangle className="text-orange-500" size={20} />
                </div>
              </CardContent>
            </Card>
          </Link>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-yellow-900 dark:text-yellow-100 mb-3">Pro Scanning Tips</h3>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Ensure good lighting and steady hands when scanning barcodes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Include all ingredients, even trace amounts, when entering manually</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                  <span>Always check for "may contain" warnings on packages</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Update your profile when medications or allergies change</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Modals */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        onManualInput={() => {
          setScannerOpen(false);
          setManualInputOpen(true);
        }}
      />

      <ManualInput
        isOpen={manualInputOpen}
        onClose={() => setManualInputOpen(false)}
        onAnalyze={handleManualAnalysis}
      />

      <AnalysisResults
        isOpen={resultsOpen}
        onClose={() => setResultsOpen(false)}
        result={currentResult}
        onSave={handleSaveResult}
        onShare={handleShareResult}
        onConsultDoctor={handleConsultDoctor}
      />
    </div>
  );
}
