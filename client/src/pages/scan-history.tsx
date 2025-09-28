import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Filter, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnalysisResults } from "@/components/analysis-results";
import type { ScanHistory } from "@shared/schema";

// Mock user ID for demo
const DEMO_USER_ID = "demo-user-123";

export default function ScanHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Get scan history
  const { data: scanHistory, isLoading } = useQuery({
    queryKey: ['/api/scans', DEMO_USER_ID],
    enabled: !!DEMO_USER_ID,
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown date';
    const scanDate = new Date(date);
    return scanDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'safe': return 'bg-accent/10 text-accent';
      case 'caution': return 'bg-yellow-100 text-yellow-800';
      case 'danger': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'safe': return 'fas fa-check-circle';
      case 'caution': return 'fas fa-exclamation-triangle';
      case 'danger': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-question-circle';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'safe': return 'Safe';
      case 'caution': return 'Caution';
      case 'danger': return 'Danger';
      default: return 'Unknown';
    }
  };

  // Filter scans based on search term and risk filter
  const filteredScans = scanHistory?.filter((scan: ScanHistory) => {
    const matchesSearch = !searchTerm || 
      (scan.productName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      scan.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = filterRisk === 'all' || scan.analysisResult.riskLevel === filterRisk;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const handleViewScan = (scan: ScanHistory) => {
    setSelectedScan(scan);
    setResultsOpen(true);
  };

  const handleSaveResult = () => {
    // Already saved in history
  };

  const handleShareResult = () => {
    if (navigator.share && selectedScan) {
      navigator.share({
        title: 'AllergyGuard Scan Result',
        text: `Scanned ${selectedScan.productName || 'Unknown Product'} - ${selectedScan.analysisResult.safe ? 'Safe' : 'Caution advised'}`,
      });
    }
  };

  const handleConsultDoctor = () => {
    // Handle doctor consultation
  };

  const riskStats = scanHistory?.reduce((acc, scan: ScanHistory) => {
    acc[scan.analysisResult.riskLevel] = (acc[scan.analysisResult.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Scan History</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your food safety scan results
          </p>
        </div>

        {/* Stats Cards */}
        {scanHistory && scanHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-lg font-bold text-accent">
                  {riskStats.safe || 0}
                </div>
                <div className="text-xs text-muted-foreground">Safe</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-lg font-bold text-yellow-600">
                  {riskStats.caution || 0}
                </div>
                <div className="text-xs text-muted-foreground">Caution</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="text-lg font-bold text-destructive">
                  {riskStats.danger || 0}
                </div>
                <div className="text-xs text-muted-foreground">Danger</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        {scanHistory && scanHistory.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products or ingredients..."
                className="pl-10"
                data-testid="input-search-scans"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant={filterRisk === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRisk('all')}
                data-testid="filter-all"
              >
                All
              </Button>
              <Button
                variant={filterRisk === 'safe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRisk('safe')}
                data-testid="filter-safe"
              >
                Safe
              </Button>
              <Button
                variant={filterRisk === 'caution' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRisk('caution')}
                data-testid="filter-caution"
              >
                Caution
              </Button>
              <Button
                variant={filterRisk === 'danger' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRisk('danger')}
                data-testid="filter-danger"
              >
                Danger
              </Button>
            </div>
          </div>
        )}

        {/* Scan History List */}
        <div className="space-y-3">
          {filteredScans.length > 0 ? (
            filteredScans.map((scan: ScanHistory) => (
              <Card key={scan.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-sm" data-testid={`scan-title-${scan.id}`}>
                          {scan.productName || "Unknown Product"}
                        </h3>
                        <Badge className={`${getRiskColor(scan.analysisResult.riskLevel)} flex items-center text-xs`}>
                          <i className={`${getRiskIcon(scan.analysisResult.riskLevel)} mr-1`}></i>
                          {getRiskLabel(scan.analysisResult.riskLevel)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                        <Calendar size={12} />
                        <span data-testid={`scan-date-${scan.id}`}>
                          {formatDate(scan.scannedAt)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        <span data-testid={`scan-summary-${scan.id}`}>
                          {scan.analysisResult.allergenAlerts.length > 0 
                            ? `${scan.analysisResult.allergenAlerts.length} allergen alert(s)`
                            : 'No allergens detected'
                          } • 
                          {scan.analysisResult.drugInteractions.length > 0
                            ? ` ${scan.analysisResult.drugInteractions.length} drug interaction(s)`
                            : ' No drug interactions'
                          }
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {scan.ingredients.slice(0, 3).map((ingredient, index) => (
                          <span 
                            key={index}
                            className="text-xs bg-muted px-2 py-1 rounded"
                            data-testid={`ingredient-${scan.id}-${index}`}
                          >
                            {ingredient}
                          </span>
                        ))}
                        {scan.ingredients.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{scan.ingredients.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewScan(scan)}
                      data-testid={`view-scan-${scan.id}`}
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : scanHistory && scanHistory.length > 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Search className="mx-auto mb-2 text-muted-foreground" size={24} />
                <p className="text-sm text-muted-foreground">No scans match your search</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords or filters</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="mx-auto mb-2 text-muted-foreground" size={24} />
                <p className="text-sm text-muted-foreground">No scan history yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start scanning food items to see your history here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Analysis Results Modal */}
      <AnalysisResults
        isOpen={resultsOpen}
        onClose={() => setResultsOpen(false)}
        result={selectedScan}
        onSave={handleSaveResult}
        onShare={handleShareResult}
        onConsultDoctor={handleConsultDoctor}
      />
    </div>
  );
}
