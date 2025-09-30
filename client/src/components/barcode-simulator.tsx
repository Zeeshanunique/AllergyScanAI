import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Package,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Database,
  Brain,
  ShieldCheck,
  BarChart3,
  PlayCircle,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SimulationStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  duration: number;
  data?: any;
}

interface BarcodeSimulatorProps {
  onScanComplete?: (result: any) => void;
}

export function BarcodeSimulator({ onScanComplete }: BarcodeSimulatorProps) {
  const [selectedBarcode, setSelectedBarcode] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const { toast } = useToast();

  const barcodes = Array.from({ length: 20 }, (_, i) => (101 + i).toString());

  const [steps, setSteps] = useState<SimulationStep[]>([
    {
      id: "scan",
      title: "Barcode Scan",
      description: "Scanning barcode and validating format",
      icon: Search,
      status: 'pending',
      duration: 1000
    },
    {
      id: "database",
      title: "Database Lookup",
      description: "Fetching product information from database",
      icon: Database,
      status: 'pending',
      duration: 1500
    },
    {
      id: "ingredients",
      title: "Ingredient Analysis",
      description: "Parsing and analyzing ingredient list",
      icon: Package,
      status: 'pending',
      duration: 2000
    },
    {
      id: "profile",
      title: "User Profile Check",
      description: "Loading user allergies and medications",
      icon: ShieldCheck,
      status: 'pending',
      duration: 1000
    },
    {
      id: "ai_analysis",
      title: "AI Analysis",
      description: "Running AI safety analysis and risk assessment",
      icon: Brain,
      status: 'pending',
      duration: 3000
    },
    {
      id: "results",
      title: "Generate Results",
      description: "Compiling analysis results and recommendations",
      icon: BarChart3,
      status: 'pending',
      duration: 1000
    }
  ]);

  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentStep(0);
    setProgress(0);
    setSimulationResult(null);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, data: undefined })));
  };

  const simulateStep = async (stepIndex: number): Promise<any> => {
    const step = steps[stepIndex];

    // Update step to processing
    setSteps(prev => prev.map((s, i) =>
      i === stepIndex ? { ...s, status: 'processing' } : s
    ));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, step.duration));

    let stepData = {};

    // Simulate step-specific logic
    switch (step.id) {
      case "scan":
        stepData = {
          barcode: selectedBarcode,
          format: "EAN-13",
          scanTime: new Date().toISOString()
        };
        break;

      case "database":
        // Simulate API call to get product data
        try {
          const response = await fetch(`/api/scan/barcode`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ barcode: selectedBarcode })
          });

          if (response.ok) {
            stepData = await response.json();
          } else {
            throw new Error('Product not found');
          }
        } catch (error) {
          stepData = {
            error: "Product not found in database",
            fallback: true
          };
        }
        break;

      case "ingredients":
        const prevData = steps[stepIndex - 1].data;
        stepData = {
          ingredientCount: prevData?.productData?.ingredients?.length || 0,
          parsedIngredients: prevData?.productData?.ingredients || [],
          allergenScan: "completed"
        };
        break;

      case "profile":
        stepData = {
          allergies: ["peanuts", "shellfish"],
          medications: ["aspirin"],
          profileLoaded: true
        };
        break;

      case "ai_analysis":
        stepData = {
          riskLevel: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
          allergenMatches: Math.floor(Math.random() * 3),
          drugInteractions: Math.floor(Math.random() * 2),
          confidenceScore: Math.floor(Math.random() * 30) + 70
        };
        break;

      case "results":
        stepData = {
          compiled: true,
          reportGenerated: true,
          scanSaved: true
        };
        break;
    }

    // Update step to completed with data
    setSteps(prev => prev.map((s, i) =>
      i === stepIndex ? { ...s, status: 'completed', data: stepData } : s
    ));

    return stepData;
  };

  const runSimulation = async () => {
    if (!selectedBarcode) {
      toast({
        title: "No Barcode Selected",
        description: "Please select a barcode to simulate",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    setProgress(0);

    try {
      let allData = {};

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        const stepData = await simulateStep(i);
        allData = { ...allData, [steps[i].id]: stepData };

        // Update progress
        setProgress(((i + 1) / steps.length) * 100);
      }

      // Simulation completed
      setSimulationResult(allData);

      if (onScanComplete) {
        onScanComplete(allData);
      }

      toast({
        title: "Simulation Complete",
        description: `Successfully analyzed barcode ${selectedBarcode}`,
      });

    } catch (error) {
      console.error("Simulation error:", error);
      toast({
        title: "Simulation Failed",
        description: "An error occurred during simulation",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStepIcon = (step: SimulationStep, index: number) => {
    const Icon = step.icon;

    if (step.status === 'processing') {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    } else if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5" />;
    } else if (step.status === 'error') {
      return <AlertTriangle className="w-5 h-5" />;
    } else {
      return <Icon className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6" />
            <span>Interactive Barcode Analysis Simulator</span>
          </CardTitle>
          <p className="text-muted-foreground">
            Select a barcode (101-120) and watch the complete analysis process step by step
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Barcode</label>
              <div className="grid grid-cols-10 gap-2">
                {barcodes.map((barcode) => (
                  <Button
                    key={barcode}
                    variant={selectedBarcode === barcode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBarcode(barcode)}
                    disabled={isSimulating}
                    className="h-8"
                  >
                    {barcode}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-4">
            <Button
              onClick={runSimulation}
              disabled={!selectedBarcode || isSimulating}
              className="flex items-center space-x-2"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start Simulation</span>
            </Button>

            <Button
              variant="outline"
              onClick={resetSimulation}
              disabled={isSimulating}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>

            {selectedBarcode && (
              <Badge variant="secondary" className="text-lg font-mono">
                Barcode: {selectedBarcode}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {isSimulating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Steps */}
      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={cn(
            "transition-all duration-300",
            step.status === 'processing' && "ring-2 ring-blue-500 ring-opacity-50",
            step.status === 'completed' && "bg-green-50 border-green-200",
            index === currentStep && isSimulating && "shadow-lg"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  getStepStatusColor(step.status)
                )}>
                  {getStepIcon(step, index)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    <Badge variant={
                      step.status === 'completed' ? 'default' :
                      step.status === 'processing' ? 'secondary' :
                      step.status === 'error' ? 'destructive' : 'outline'
                    }>
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>

                  {step.status === 'processing' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Processing... (~{step.duration}ms)</span>
                    </div>
                  )}

                  {step.data && step.status === 'completed' && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium">View Step Data</summary>
                        <pre className="mt-2 text-xs overflow-auto">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono text-muted-foreground">
                    {step.duration}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Final Results */}
      {simulationResult && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <CheckCircle className="w-6 h-6" />
              <span>Simulation Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Product Info</h4>
                  <p className="text-sm">Barcode: {selectedBarcode}</p>
                  <p className="text-sm">Status: Analysis Complete</p>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
                  <p className="text-sm">
                    Risk Level: {simulationResult.ai_analysis?.riskLevel || 'Unknown'}
                  </p>
                  <p className="text-sm">
                    Confidence: {simulationResult.ai_analysis?.confidenceScore || 0}%
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Analysis Results</h4>
                  <p className="text-sm">
                    Allergen Matches: {simulationResult.ai_analysis?.allergenMatches || 0}
                  </p>
                  <p className="text-sm">
                    Drug Interactions: {simulationResult.ai_analysis?.drugInteractions || 0}
                  </p>
                </div>
              </div>

              <details className="p-4 bg-white rounded-lg">
                <summary className="cursor-pointer font-semibold">View Complete Analysis Data</summary>
                <pre className="mt-4 text-xs overflow-auto bg-gray-50 p-4 rounded">
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}