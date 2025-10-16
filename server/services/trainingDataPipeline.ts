import Database from 'better-sqlite3';
import { writeFileSync, readFileSync } from 'fs';
import { TrainingData } from './mlAnalysis';
import { ScanHistory, User } from '../../shared/schema';

// Training Data Pipeline Class
class TrainingDataPipeline {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Extract training data from scan history
  async extractTrainingData(): Promise<TrainingData[]> {
    console.log('📊 Extracting training data from scan history...');
    
    try {
      // Get all scan history with user data
      const query = `
        SELECT 
          sh.id,
          sh.user_id,
          sh.product_name,
          sh.barcode,
          sh.ingredients,
          sh.analysis_result,
          sh.scanned_at,
          u.allergies,
          u.medications
        FROM scan_history sh
        JOIN users u ON sh.user_id = u.id
        WHERE sh.ingredients IS NOT NULL 
        AND sh.ingredients != '[]'
        AND sh.analysis_result IS NOT NULL
        ORDER BY sh.scanned_at DESC
      `;

      const rows = this.db.prepare(query).all() as Array<{
        id: string;
        user_id: string;
        product_name: string | null;
        barcode: string | null;
        ingredients: string;
        analysis_result: string;
        scanned_at: string;
        allergies: string;
        medications: string;
      }>;

      console.log(`📈 Found ${rows.length} scan records for training`);

      const trainingData: TrainingData[] = [];

      for (const row of rows) {
        try {
          // Parse ingredients
          const ingredients = JSON.parse(row.ingredients) as string[];
          
          // Parse analysis result
          const analysisResult = JSON.parse(row.analysis_result) as {
            safe: boolean;
            allergenAlerts: Array<{
              allergen: string;
              severity: 'low' | 'medium' | 'high';
              message: string;
            }>;
            drugInteractions: Array<{
              medication: string;
              ingredient: string;
              severity: 'low' | 'medium' | 'high';
              message: string;
            }>;
            riskLevel: 'safe' | 'caution' | 'danger';
          };

          // Parse user allergies and medications
          const userAllergies = row.allergies ? JSON.parse(row.allergies) as string[] : [];
          const userMedications = row.medications ? JSON.parse(row.medications) as string[] : [];

          // Determine risk level from analysis result
          let riskLevel: 'safe' | 'caution' | 'danger' = 'safe';
          
          if (analysisResult.riskLevel) {
            riskLevel = analysisResult.riskLevel;
          } else if (!analysisResult.safe) {
            // Determine risk level based on alerts
            const hasHighSeverity = analysisResult.allergenAlerts.some(alert => alert.severity === 'high') ||
                                  analysisResult.drugInteractions.some(interaction => interaction.severity === 'high');
            
            const hasMediumSeverity = analysisResult.allergenAlerts.some(alert => alert.severity === 'medium') ||
                                    analysisResult.drugInteractions.some(interaction => interaction.severity === 'medium');

            if (hasHighSeverity) {
              riskLevel = 'danger';
            } else if (hasMediumSeverity || analysisResult.allergenAlerts.length > 0 || analysisResult.drugInteractions.length > 0) {
              riskLevel = 'caution';
            }
          }

          // Create training data entry
          const trainingEntry: TrainingData = {
            ingredients: ingredients.map(ing => ing.toLowerCase().trim()),
            userAllergies: userAllergies.map(allergy => allergy.toLowerCase().trim()),
            userMedications: userMedications.map(med => med.toLowerCase().trim()),
            riskLevel,
            allergenAlerts: analysisResult.allergenAlerts.map(alert => ({
              allergen: alert.allergen.toLowerCase().trim(),
              severity: alert.severity
            })),
            drugInteractions: analysisResult.drugInteractions.map(interaction => ({
              medication: interaction.medication.toLowerCase().trim(),
              ingredient: interaction.ingredient.toLowerCase().trim(),
              severity: interaction.severity
            }))
          };

          trainingData.push(trainingEntry);

        } catch (parseError) {
          console.warn(`⚠️ Failed to parse scan record ${row.id}:`, parseError);
          continue;
        }
      }

      console.log(`✅ Extracted ${trainingData.length} training samples`);
      
      // Log data distribution
      const distribution = this.calculateDataDistribution(trainingData);
      console.log('📊 Training data distribution:', distribution);

      return trainingData;

    } catch (error) {
      console.error('❌ Failed to extract training data:', error);
      throw error;
    }
  }

  // Calculate data distribution for analysis
  private calculateDataDistribution(trainingData: TrainingData[]): {
    total: number;
    safe: number;
    caution: number;
    danger: number;
    withAllergens: number;
    withDrugInteractions: number;
  } {
    const distribution = {
      total: trainingData.length,
      safe: 0,
      caution: 0,
      danger: 0,
      withAllergens: 0,
      withDrugInteractions: 0
    };

    trainingData.forEach(data => {
      // Count by risk level
      distribution[data.riskLevel]++;
      
      // Count samples with allergens
      if (data.allergenAlerts.length > 0) {
        distribution.withAllergens++;
      }
      
      // Count samples with drug interactions
      if (data.drugInteractions.length > 0) {
        distribution.withDrugInteractions++;
      }
    });

    return distribution;
  }

  // Generate synthetic training data for better coverage
  async generateSyntheticData(baseData: TrainingData[]): Promise<TrainingData[]> {
    console.log('🎭 Generating synthetic training data...');
    
    const syntheticData: TrainingData[] = [];
    
    // Common allergens and their variations
    const allergenVariations: Record<string, string[]> = {
      'nuts': ['almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts', 'macadamia nuts'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
      'gluten': ['wheat', 'barley', 'rye', 'oats', 'flour', 'bread', 'pasta'],
      'soy': ['soybean', 'tofu', 'tempeh', 'miso', 'soy sauce', 'soy lecithin'],
      'eggs': ['egg', 'albumin', 'lecithin', 'mayonnaise'],
      'fish': ['salmon', 'tuna', 'cod', 'anchovy', 'fish oil'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'scallop', 'oyster']
    };

    // Common medications and their interactions
    const medicationInteractions: Record<string, string[]> = {
      'warfarin': ['vitamin k', 'green leafy vegetables', 'broccoli', 'spinach', 'kale'],
      'digoxin': ['licorice', 'st johns wort', 'grapefruit', 'hawthorn'],
      'statins': ['grapefruit', 'pomegranate', 'red yeast rice'],
      'blood pressure medication': ['licorice', 'grapefruit', 'salt', 'sodium'],
      'diabetes medication': ['alcohol', 'grapefruit', 'cinnamon', 'chromium']
    };

    // Generate synthetic samples for each base sample
    baseData.forEach(baseSample => {
      // Generate allergen variations
      baseSample.userAllergies.forEach(allergen => {
        const variations = allergenVariations[allergen.toLowerCase()];
        if (variations) {
          variations.forEach(variation => {
            const syntheticSample: TrainingData = {
              ...baseSample,
              ingredients: [...baseSample.ingredients, variation],
              allergenAlerts: [
                ...baseSample.allergenAlerts,
                {
                  allergen: variation,
                  severity: 'high' as const
                }
              ],
              riskLevel: 'danger' as const
            };
            syntheticData.push(syntheticSample);
          });
        }
      });

      // Generate medication interaction variations
      baseSample.userMedications.forEach(medication => {
        const interactions = medicationInteractions[medication.toLowerCase()];
        if (interactions) {
          interactions.forEach(interactionIngredient => {
            const syntheticSample: TrainingData = {
              ...baseSample,
              ingredients: [...baseSample.ingredients, interactionIngredient],
              drugInteractions: [
                ...baseSample.drugInteractions,
                {
                  medication,
                  ingredient: interactionIngredient,
                  severity: 'high' as const
                }
              ],
              riskLevel: baseSample.riskLevel === 'safe' ? 'caution' as const : baseSample.riskLevel
            };
            syntheticData.push(syntheticSample);
          });
        }
      });
    });

    console.log(`🎭 Generated ${syntheticData.length} synthetic training samples`);
    return syntheticData;
  }

  // Validate training data quality
  validateTrainingData(trainingData: TrainingData[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum data size
    if (trainingData.length < 50) {
      issues.push(`Insufficient training data: ${trainingData.length} samples (minimum: 50)`);
      recommendations.push('Collect more scan data or generate synthetic samples');
    }

    // Check class balance
    const distribution = this.calculateDataDistribution(trainingData);
    const total = distribution.total;
    const safeRatio = distribution.safe / total;
    const cautionRatio = distribution.caution / total;
    const dangerRatio = distribution.danger / total;

    if (safeRatio > 0.8) {
      issues.push(`Class imbalance: ${(safeRatio * 100).toFixed(1)}% safe samples`);
      recommendations.push('Generate more caution/danger samples');
    }

    if (dangerRatio < 0.1) {
      issues.push(`Low danger samples: ${(dangerRatio * 100).toFixed(1)}%`);
      recommendations.push('Generate more high-risk samples');
    }

    // Check ingredient diversity
    const allIngredients = new Set<string>();
    trainingData.forEach(data => {
      data.ingredients.forEach(ingredient => {
        allIngredients.add(ingredient);
      });
    });

    if (allIngredients.size < 100) {
      issues.push(`Low ingredient diversity: ${allIngredients.size} unique ingredients`);
      recommendations.push('Collect data from more diverse products');
    }

    // Check for empty data
    const emptySamples = trainingData.filter(data => 
      data.ingredients.length === 0 || 
      data.userAllergies.length === 0
    );

    if (emptySamples.length > 0) {
      issues.push(`${emptySamples.length} samples with missing data`);
      recommendations.push('Clean up incomplete samples');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Export training data to JSON file
  async exportTrainingData(trainingData: TrainingData[], filename: string = 'training-data.json'): Promise<void> {
    console.log(`💾 Exporting training data to ${filename}...`);
    
    try {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalSamples: trainingData.length,
          distribution: this.calculateDataDistribution(trainingData)
        },
        trainingData
      };

      await writeFileSync(filename, JSON.stringify(exportData, null, 2));
      console.log(`✅ Training data exported to ${filename}`);
      
    } catch (error) {
      console.error('❌ Failed to export training data:', error);
      throw error;
    }
  }

  // Import training data from JSON file
  async importTrainingData(filename: string): Promise<TrainingData[]> {
    console.log(`📥 Importing training data from ${filename}...`);
    
    try {
      const fileContent = readFileSync(filename, 'utf-8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.trainingData || !Array.isArray(importData.trainingData)) {
        throw new Error('Invalid training data format');
      }

      console.log(`✅ Imported ${importData.trainingData.length} training samples`);
      return importData.trainingData as TrainingData[];
      
    } catch (error) {
      console.error('❌ Failed to import training data:', error);
      throw error;
    }
  }
}

// Export functions
export async function extractTrainingDataFromDatabase(db: Database.Database): Promise<TrainingData[]> {
  const pipeline = new TrainingDataPipeline(db);
  return await pipeline.extractTrainingData();
}

export async function generateSyntheticTrainingData(baseData: TrainingData[]): Promise<TrainingData[]> {
  const pipeline = new TrainingDataPipeline(null as any); // We don't need db for this
  return await pipeline.generateSyntheticData(baseData);
}

export function validateTrainingDataQuality(trainingData: TrainingData[]): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const pipeline = new TrainingDataPipeline(null as any);
  return pipeline.validateTrainingData(trainingData);
}

export async function exportTrainingDataToFile(trainingData: TrainingData[], filename?: string): Promise<void> {
  const pipeline = new TrainingDataPipeline(null as any);
  return await pipeline.exportTrainingData(trainingData, filename);
}

export async function importTrainingDataFromFile(filename: string): Promise<TrainingData[]> {
  const pipeline = new TrainingDataPipeline(null as any);
  return await pipeline.importTrainingData(filename);
}

export { TrainingDataPipeline };
