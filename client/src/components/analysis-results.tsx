import { X, CheckCircle, AlertTriangle, Share, Bookmark, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScanHistory } from "@shared/schema";

interface AnalysisResultsProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScanHistory | null;
  onSave: () => void;
  onShare: () => void;
  onConsultDoctor: () => void;
}

export function AnalysisResults({ 
  isOpen, 
  onClose, 
  result, 
  onSave, 
  onShare, 
  onConsultDoctor 
}: AnalysisResultsProps) {
  if (!isOpen || !result) return null;

  const { analysisResult, productName, ingredients } = result;
  const { safe, allergenAlerts, drugInteractions, riskLevel } = analysisResult;

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
      case 'safe': return <CheckCircle className="mr-2" size={16} />;
      case 'caution': 
      case 'danger': return <AlertTriangle className="mr-2" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50" data-testid="analysis-results-modal">
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1"
              data-testid="button-close-results"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getRiskColor(riskLevel)} flex items-center`}>
              {getRiskIcon(riskLevel)}
              {safe ? 'Safe to consume' : riskLevel === 'caution' ? 'Use caution' : 'Do not consume'}
            </Badge>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold" data-testid="text-product-name">
                {productName || "Unknown Product"}
              </h4>
              {result.barcode && ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120'].includes(result.barcode) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  Demo Product
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Scanned {result.scannedAt ? new Date(result.scannedAt).toLocaleString() : 'recently'}
              {result.barcode && (
                <span className="ml-2">• Barcode: {result.barcode}</span>
              )}
            </p>
          </div>
          
          {/* Allergen Check */}
          <div className="space-y-3">
            <h4 className="font-semibold">Allergen Analysis</h4>
            
            {allergenAlerts.length > 0 ? (
              allergenAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                      <AlertTriangle className="text-destructive-foreground" size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" data-testid={`allergen-${index}`}>
                        {alert.allergen}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Severity: {alert.severity}
                      </p>
                    </div>
                  </div>
                  <span className="text-destructive font-medium text-sm">Detected</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <CheckCircle className="text-accent-foreground" size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">No known allergens detected</p>
                    <p className="text-xs text-muted-foreground">Based on your profile</p>
                  </div>
                </div>
                <span className="text-accent font-medium text-sm">Safe</span>
              </div>
            )}
          </div>
          
          {/* Drug Interactions */}
          <div className="space-y-3">
            <h4 className="font-semibold">Medication Interactions</h4>
            
            {drugInteractions.length > 0 ? (
              drugInteractions.map((interaction, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="text-yellow-600" size={16} />
                    <p className="font-medium text-sm">Potential interaction found</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {interaction.medication} may interact with {interaction.ingredient}
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">{interaction.message}</p>
                </div>
              ))
            ) : (
              <div className="bg-accent/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="text-accent" size={16} />
                  <p className="font-medium text-sm">No interactions found</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This product appears safe with your current medications
                </p>
              </div>
            )}
          </div>
          
          {/* Ingredients List */}
          <div className="space-y-3">
            <h4 className="font-semibold">Detected Ingredients</h4>
            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ingredient, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-card rounded-full text-xs"
                    data-testid={`ingredient-${index}`}
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={onSave}
              className="w-full bg-accent text-accent-foreground"
              data-testid="button-save-result"
            >
              <Bookmark className="mr-2" size={16} />
              Save to History
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="secondary"
                onClick={onShare}
                data-testid="button-share-result"
              >
                <Share className="mr-2" size={16} />
                Share
              </Button>
              <Button
                variant="secondary"
                onClick={onConsultDoctor}
                data-testid="button-consult-doctor"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Stethoscope className="mr-2" size={16} />
                Ask Doctor
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
