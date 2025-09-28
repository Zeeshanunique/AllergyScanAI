import { useState } from "react";
import { Camera, Edit, User, History, Stethoscope, LightbulbIcon } from "lucide-react";
import { Link } from "wouter";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ManualInput } from "@/components/manual-input";
import { AnalysisResults } from "@/components/analysis-results";
import { AIChatbot, AIChatbotButton } from "@/components/ai-chatbot";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScanHistory } from "@shared/schema";

// Mock user ID for demo - in real app this would come from authentication
const DEMO_USER_ID = "demo-user-123";

export default function Home() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanHistory | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<ScanHistory | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get recent scans
  const { data: recentScans, isLoading: scansLoading } = useQuery({
    queryKey: ['/api/scans', DEMO_USER_ID],
  });

  // Get user profile
  const { data: userProfile } = useQuery({
    queryKey: ['/api/users', DEMO_USER_ID],
  });

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
      
      // Check for high-risk alerts
      if (data.analysisResult.riskLevel === 'danger') {
        setEmergencyAlert(data.scan);
      }
      
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
      
      if (data.analysisResult.riskLevel === 'danger') {
        setEmergencyAlert(data.scan);
      }
      
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

  const dismissEmergencyAlert = () => {
    setEmergencyAlert(null);
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Unknown time';
    const now = new Date();
    const scanDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - scanDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
          <i className="fas fa-check-circle mr-1"></i>
          Safe
        </span>;
      case 'caution':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          Caution
        </span>;
      case 'danger':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <i className="fas fa-exclamation-triangle mr-1"></i>
          Danger
        </span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Emergency Alert Banner */}
      {emergencyAlert && (
        <Alert className="bg-destructive text-destructive-foreground m-4 border-l-4 border-red-600">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-xl mt-0.5"></i>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">High Risk Alert!</h3>
              <AlertDescription className="text-sm mt-1">
                {emergencyAlert.productName || "This product"} contains allergens you're severely allergic to. DO NOT CONSUME.
              </AlertDescription>
              <div className="flex space-x-2 mt-2">
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={handleConsultDoctor}
                  className="bg-red-700 text-white hover:bg-red-800"
                  data-testid="button-emergency-doctor"
                >
                  Contact Doctor Now
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={dismissEmergencyAlert}
                  data-testid="button-dismiss-alert"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Quick Scan Section */}
      <section className="p-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-ring"></div>
            <Camera className="text-primary text-2xl relative z-10" size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Scan Your Food</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Point your camera at the barcode or food label to check for allergens and drug interactions
          </p>
          <Button 
            onClick={() => setScannerOpen(true)}
            className="w-full"
            data-testid="button-start-scanning"
          >
            <i className="fas fa-qrcode mr-2"></i>
            Start Scanning
          </Button>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setManualInputOpen(true)}
            className="bg-card border border-border rounded-lg p-4 text-left hover:bg-secondary/50 transition-colors"
            data-testid="button-manual-input"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-3">
              <Edit className="text-accent" size={20} />
            </div>
            <h4 className="font-medium text-sm">Manual Input</h4>
            <p className="text-xs text-muted-foreground mt-1">Enter ingredients manually</p>
          </button>
          
          <Link href="/profile">
            <button 
              className="bg-card border border-border rounded-lg p-4 text-left hover:bg-secondary/50 transition-colors w-full"
              data-testid="button-profile"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <User className="text-primary" size={20} />
              </div>
              <h4 className="font-medium text-sm">My Profile</h4>
              <p className="text-xs text-muted-foreground mt-1">Update allergies & meds</p>
            </button>
          </Link>
          
          <Link href="/history">
            <button 
              className="bg-card border border-border rounded-lg p-4 text-left hover:bg-secondary/50 transition-colors w-full"
              data-testid="button-history"
            >
              <div className="w-10 h-10 bg-secondary/50 rounded-lg flex items-center justify-center mb-3">
                <History className="text-muted-foreground" size={20} />
              </div>
              <h4 className="font-medium text-sm">Scan History</h4>
              <p className="text-xs text-muted-foreground mt-1">View past results</p>
            </button>
          </Link>
          
          <button 
            onClick={handleConsultDoctor}
            className="bg-card border border-border rounded-lg p-4 text-left hover:bg-secondary/50 transition-colors"
            data-testid="button-consult-doctor"
          >
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-3">
              <Stethoscope className="text-accent" size={20} />
            </div>
            <h4 className="font-medium text-sm">Consult Doctor</h4>
            <p className="text-xs text-muted-foreground mt-1">Book appointment</p>
          </button>
        </div>
      </section>

      {/* Recent Scans */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Recent Scans</h3>
          <Link href="/history">
            <button className="text-primary text-sm font-medium" data-testid="button-view-all-scans">
              View All
            </button>
          </Link>
        </div>
        
        {scansLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentScans && recentScans.length > 0 ? (
          <div className="space-y-3">
            {recentScans.slice(0, 3).map((scan: ScanHistory) => (
              <div key={scan.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-sm" data-testid={`scan-name-${scan.id}`}>
                        {scan.productName || "Unknown Product"}
                      </h4>
                      {getRiskBadge(scan.analysisResult.riskLevel)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2" data-testid={`scan-time-${scan.id}`}>
                      Scanned {formatTimeAgo(scan.scannedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`scan-summary-${scan.id}`}>
                      {scan.analysisResult.allergenAlerts.length === 0 ? 'No allergens detected' : `${scan.analysisResult.allergenAlerts.length} allergen(s) found`} • 
                      {scan.analysisResult.drugInteractions.length === 0 ? ' No drug interactions' : ` ${scan.analysisResult.drugInteractions.length} interaction(s)`}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentResult(scan);
                      setResultsOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground p-1"
                    data-testid={`button-view-scan-${scan.id}`}
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <History className="mx-auto mb-2 text-muted-foreground" size={24} />
            <p className="text-sm text-muted-foreground">No scans yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start scanning to see your history here</p>
          </div>
        )}
      </section>

      {/* Health Tips */}
      <section className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Health Tips</h3>
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <LightbulbIcon className="text-accent-foreground" size={16} />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Reading Food Labels</h4>
              <p className="text-xs text-muted-foreground">
                Always check the "Contains" section and ingredient list for potential allergens, even in products you've used before.
              </p>
            </div>
          </div>
        </div>
      </section>

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

      <AIChatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        userId={DEMO_USER_ID}
      />

      <AIChatbotButton onClick={() => setChatbotOpen(true)} />
    </div>
  );
}
