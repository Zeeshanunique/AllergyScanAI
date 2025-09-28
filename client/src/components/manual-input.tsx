import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ManualInputProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (data: { productName?: string; ingredients: string }) => void;
}

export function ManualInput({ isOpen, onClose, onAnalyze }: ManualInputProps) {
  const [productName, setProductName] = useState("");
  const [ingredients, setIngredients] = useState("");

  const commonAllergens = [
    "Peanuts", "Tree nuts", "Dairy", "Eggs", "Soy", "Gluten", "Fish", "Shellfish"
  ];

  const handleSubmit = () => {
    if (!ingredients.trim()) return;
    
    onAnalyze({ 
      productName: productName.trim() || undefined, 
      ingredients: ingredients.trim() 
    });
    
    // Reset form
    setProductName("");
    setIngredients("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" data-testid="manual-input-modal">
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Enter Ingredients</h3>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            data-testid="button-close-manual-input"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="product-name" className="text-sm font-medium">
              Product Name (Optional)
            </Label>
            <Input
              id="product-name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Homemade Pasta Salad"
              className="mt-2"
              data-testid="input-product-name"
            />
          </div>
          
          <div>
            <Label htmlFor="ingredients" className="text-sm font-medium">
              Ingredients *
            </Label>
            <Textarea
              id="ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Enter each ingredient on a new line or separated by commas..."
              className="mt-2 h-32"
              data-testid="textarea-ingredients"
            />
            <p className="text-xs text-muted-foreground mt-1">
              List all ingredients you know about. Our AI will analyze them for potential allergens and interactions.
            </p>
          </div>
          
          <div className="bg-muted rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Common ingredients to watch for:</h4>
            <div className="flex flex-wrap gap-2">
              {commonAllergens.map((allergen) => (
                <span 
                  key={allergen}
                  className="inline-flex items-center px-2 py-1 bg-background rounded text-xs"
                  data-testid={`allergen-${allergen.toLowerCase()}`}
                >
                  {allergen}
                </span>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={handleSubmit}
            disabled={!ingredients.trim()}
            className="w-full"
            data-testid="button-analyze-ingredients"
          >
            <i className="fas fa-search mr-2"></i>
            Analyze Ingredients
          </Button>
        </div>
      </div>
    </div>
  );
}
