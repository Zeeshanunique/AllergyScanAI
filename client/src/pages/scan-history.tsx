import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, History, Sparkles, CheckCircle, AlertTriangle, Shield, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnalysisResults } from "@/components/analysis-results";
import { DoctorConsultation } from "@/components/doctor-consultation";
import { useAuth } from "@/contexts/AuthContext";
import type { ScanHistory } from "@shared/schema";

export default function ScanHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [selectedScan, setSelectedScan] = useState<ScanHistory | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [doctorConsultationOpen, setDoctorConsultationOpen] = useState(false);

  const { user } = useAuth();

  // Get scan history
  const { data: scansResponse, isLoading } = useQuery({
    queryKey: ['/api/scans'],
    enabled: !!user,
  });

  // Extract scans array from response (handle both old and new API format)
  const scanHistory = Array.isArray(scansResponse) ? scansResponse : ((scansResponse as any)?.scans || []);

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


  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'safe': return 'Safe';
      case 'caution': return 'Caution';
      case 'danger': return 'Danger';
      default: return 'Unknown';
    }
  };

  // Filter scans based on search term and risk filter
  const filteredScans = (scanHistory && Array.isArray(scanHistory)) ? scanHistory.filter((scan: ScanHistory) => {
    const matchesSearch = !searchTerm || 
      (scan.productName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      scan.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = filterRisk === 'all' || scan.analysisResult.riskLevel === filterRisk;
    
    return matchesSearch && matchesFilter;
  }) : [];

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
    setResultsOpen(false);
    setDoctorConsultationOpen(true);
  };

  const riskStats = (scanHistory && Array.isArray(scanHistory)) ? scanHistory.reduce((acc: Record<string, number>, scan: ScanHistory) => {
    acc[scan.analysisResult.riskLevel] = (acc[scan.analysisResult.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-full border border-purple-200 dark:border-purple-800">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Scan Analytics & History</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-pink-800 dark:from-gray-100 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
            Scan History
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            View and analyze your food safety scan results with detailed insights and trends
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {scanHistory && Array.isArray(scanHistory) && scanHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Scans</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{scanHistory.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <History className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Safe Items</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{riskStats.safe || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Caution</p>
                  <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{riskStats.caution || 0}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">High Risk</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">{riskStats.danger || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      {scanHistory && Array.isArray(scanHistory) && scanHistory.length > 0 && (
        <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span>Search & Filter</span>
            </CardTitle>
            <p className="text-muted-foreground">Find specific scans or filter by safety level</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products, ingredients, or brands..."
                className="pl-12 h-12 text-base"
                data-testid="input-search-scans"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Filter by Safety Level</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant={filterRisk === 'all' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setFilterRisk('all')}
                  className={filterRisk === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 hover:bg-blue-50'}
                  data-testid="filter-all"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  All ({scanHistory.length})
                </Button>
                <Button
                  variant={filterRisk === 'safe' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setFilterRisk('safe')}
                  className={filterRisk === 'safe' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 hover:bg-green-50'}
                  data-testid="filter-safe"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Safe ({riskStats.safe || 0})
                </Button>
                <Button
                  variant={filterRisk === 'caution' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setFilterRisk('caution')}
                  className={filterRisk === 'caution' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-yellow-300 hover:bg-yellow-50'}
                  data-testid="filter-caution"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Caution ({riskStats.caution || 0})
                </Button>
                <Button
                  variant={filterRisk === 'danger' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setFilterRisk('danger')}
                  className={filterRisk === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'border-red-300 hover:bg-red-50'}
                  data-testid="filter-danger"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Danger ({riskStats.danger || 0})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <History className="w-5 h-5 text-purple-600" />
            <span>Your Scan History</span>
          </CardTitle>
          <p className="text-muted-foreground">
            {filteredScans.length > 0 ? `Showing ${filteredScans.length} scan(s)` : 'No scans to display'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredScans.length > 0 ? (
            filteredScans.map((scan: ScanHistory) => (
              <Card key={scan.id} className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          scan.analysisResult.riskLevel === 'safe'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : scan.analysisResult.riskLevel === 'caution'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {scan.analysisResult.riskLevel === 'safe' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : scan.analysisResult.riskLevel === 'caution' ? (
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                          ) : (
                            <Shield className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-foreground" data-testid={`scan-title-${scan.id}`}>
                            {scan.productName || "Unknown Product"}
                          </h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <Badge className={`${getRiskColor(scan.analysisResult.riskLevel)} px-3 py-1 font-medium`}>
                              {getRiskLabel(scan.analysisResult.riskLevel)}
                            </Badge>
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Clock size={14} />
                              <span data-testid={`scan-date-${scan.id}`}>
                                {formatDate(scan.scannedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Health Analysis</p>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2" data-testid={`scan-summary-${scan.id}`}>
                              {scan.analysisResult.allergenAlerts.length > 0 ? (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <span className="text-sm">
                                {scan.analysisResult.allergenAlerts.length > 0
                                  ? `${scan.analysisResult.allergenAlerts.length} allergen alert(s)`
                                  : 'No allergens detected'
                                }
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {scan.analysisResult.drugInteractions.length > 0 ? (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <span className="text-sm">
                                {scan.analysisResult.drugInteractions.length > 0
                                  ? `${scan.analysisResult.drugInteractions.length} drug interaction(s)`
                                  : 'No drug interactions'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Key Ingredients</p>
                          <div className="flex flex-wrap gap-2">
                            {scan.ingredients.slice(0, 4).map((ingredient, index) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full"
                                data-testid={`ingredient-${scan.id}-${index}`}
                              >
                                {ingredient}
                              </span>
                            ))}
                            {scan.ingredients.length > 4 && (
                              <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                +{scan.ingredients.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      onClick={() => handleViewScan(scan)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg ml-4"
                      data-testid={`view-scan-${scan.id}`}
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : scanHistory && Array.isArray(scanHistory) && scanHistory.length > 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">No matches found</h3>
              <p className="text-sm text-muted-foreground mb-4">No scans match your current search and filter criteria</p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterRisk('all'); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">No scan history yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Start scanning food items to build your safety history</p>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
                Start Scanning
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results Modal */}
      <AnalysisResults
        isOpen={resultsOpen}
        onClose={() => setResultsOpen(false)}
        result={selectedScan}
        onSave={handleSaveResult}
        onShare={handleShareResult}
        onConsultDoctor={handleConsultDoctor}
      />

      {/* Doctor Consultation Modal */}
      <DoctorConsultation
        isOpen={doctorConsultationOpen}
        onClose={() => setDoctorConsultationOpen(false)}
        scanResult={selectedScan}
      />
      </div>
    </div>
  );
}
