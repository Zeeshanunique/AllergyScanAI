import { useState } from "react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ManualInput } from "@/components/manual-input";
import { AnalysisResults } from "@/components/analysis-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Edit, History } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScanHistory } from "@shared/schema";

// Mock user ID for demo
const DEMO_USER_ID = "demo-user-123";

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
        barcode,
        userId: DEMO_USER_ID
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResult(data.scan);
      setScannerOpen(false);
      setResultsOpen(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/scans', DEMO_USER_ID] });
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
      const response = await apiRequest('POST', '/api/scan/manual', {
        ...data,
        userId: DEMO_USER_ID
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentResult(data.scan);
      setManualInputOpen(false);
      setResultsOpen(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/scans', DEMO_USER_ID] });
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
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Food Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Scan or enter food items to check for allergens and drug interactions
          </p>
        </div>

        {/* Scanning Options */}
        <div className="space-y-4">
          {/* Barcode Scanner */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-ring"></div>
                <Camera className="text-primary relative z-10" size={28} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Scan Barcode</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Point your camera at the product barcode for instant ingredient analysis
              </p>
              <Button 
                onClick={() => setScannerOpen(true)}
                className="w-full"
                disabled={barcodeScanMutation.isPending}
                data-testid="button-open-barcode-scanner"
              >
                {barcodeScanMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Scanning...
                  </div>
                ) : (
                  <>
                    <i className="fas fa-qrcode mr-2"></i>
                    Start Barcode Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="text-accent" size={28} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Manual Entry</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Type in ingredients for homemade or unlabeled foods
              </p>
              <Button 
                onClick={() => setManualInputOpen(true)}
                variant="outline"
                className="w-full"
                disabled={manualAnalysisMutation.isPending}
                data-testid="button-open-manual-input"
              >
                {manualAnalysisMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                    Analyzing...
                  </div>
                ) : (
                  <>
                    <Edit className="mr-2" size={16} />
                    Enter Manually
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          
          <Link href="/history">
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center">
                    <History className="text-muted-foreground" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">View Scan History</h4>
                    <p className="text-xs text-muted-foreground">See all your previous scans and results</p>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground text-xs"></i>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile">
            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-user-md text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Update Profile</h4>
                    <p className="text-xs text-muted-foreground">Manage your allergies and medications</p>
                  </div>
                  <i className="fas fa-chevron-right text-muted-foreground text-xs"></i>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Safety Tips */}
        <Card className="bg-gradient-to-r from-accent/10 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fas fa-lightbulb text-accent-foreground text-sm"></i>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Scanning Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure good lighting when scanning barcodes</li>
                  <li>• Include all ingredients when entering manually</li>
                  <li>• Check for "may contain" warnings on packages</li>
                  <li>• Update your profile when medications change</li>
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
