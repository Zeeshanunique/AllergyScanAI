import * as tf from '@tensorflow/tfjs-node';
import { BarcodeData } from './foodApi';

// Analysis Result Interface
export interface AnalysisResult {
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
  confidence?: number;
  analysisMethod?: 'ML' | 'LLM' | 'Hybrid';
  analysisTime?: number;
}

// ML Model Configuration
interface MLConfig {
  modelPath: string;
  inputSize: number;
  outputClasses: string[];
  confidenceThreshold: number;
}

// Training Data Structure
interface TrainingData {
  ingredients: string[];
  userAllergies: string[];
  userMedications: string[];
  riskLevel: 'safe' | 'caution' | 'danger';
  allergenAlerts: Array<{
    allergen: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  drugInteractions: Array<{
    medication: string;
    ingredient: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// ML Model Class
class IngredientAnalysisModel {
  private model: tf.LayersModel | null = null;
  private config: MLConfig;
  private vocabulary: Map<string, number> = new Map();
  private allergenVocabulary: Map<string, number> = new Map();
  private medicationVocabulary: Map<string, number> = new Map();
  private isModelLoaded = false;

  constructor() {
    this.config = {
      modelPath: './models/ingredient-analysis-model',
      inputSize: 1000, // Vocabulary size
      outputClasses: ['safe', 'caution', 'danger'],
      confidenceThreshold: 0.7
    };
  }

  // Initialize vocabulary from training data
  async initializeVocabulary(trainingData: TrainingData[]): Promise<void> {
    console.log('🔤 Initializing ML vocabulary from training data...');
    
    const allIngredients = new Set<string>();
    const allAllergens = new Set<string>();
    const allMedications = new Set<string>();

    trainingData.forEach(data => {
      data.ingredients.forEach(ingredient => {
        allIngredients.add(ingredient.toLowerCase());
      });
      data.userAllergies.forEach(allergen => {
        allAllergens.add(allergen.toLowerCase());
      });
      data.userMedications.forEach(medication => {
        allMedications.add(medication.toLowerCase());
      });
    });

    // Build vocabulary maps
    let index = 0;
    allIngredients.forEach(ingredient => {
      this.vocabulary.set(ingredient, index++);
    });

    index = 0;
    allAllergens.forEach(allergen => {
      this.allergenVocabulary.set(allergen, index++);
    });

    index = 0;
    allMedications.forEach(medication => {
      this.medicationVocabulary.set(medication, index++);
    });

    console.log(`📚 Vocabulary initialized: ${this.vocabulary.size} ingredients, ${this.allergenVocabulary.size} allergens, ${this.medicationVocabulary.size} medications`);
  }

  // Create neural network model
  createModel(): tf.LayersModel {
    console.log('🧠 Creating ML model architecture...');
    
    const model = tf.sequential({
      layers: [
        // Input layer for ingredients
        tf.layers.dense({
          inputShape: [this.config.inputSize],
          units: 512,
          activation: 'relu',
          name: 'ingredient_input'
        }),
        
        // Dropout for regularization
        tf.layers.dropout({ rate: 0.3 }),
        
        // Hidden layers
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          name: 'hidden_1'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          name: 'hidden_2'
        }),
        
        // Output layer for risk classification
        tf.layers.dense({
          units: 3, // safe, caution, danger
          activation: 'softmax',
          name: 'risk_output'
        })
      ]
    });

    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    console.log('✅ ML model created and compiled');
    return model;
  }

  // Convert text to numerical features
  textToFeatures(ingredients: string[], allergies: string[], medications: string[]): tf.Tensor2D {
    const features = new Array(this.config.inputSize).fill(0);
    
    // Encode ingredients
    ingredients.forEach(ingredient => {
      const index = this.vocabulary.get(ingredient.toLowerCase());
      if (index !== undefined && index < this.config.inputSize) {
        features[index] = 1;
      }
    });
    
    // Encode allergies (offset by ingredient vocabulary size)
    const allergenOffset = Math.floor(this.config.inputSize * 0.6);
    allergies.forEach(allergen => {
      const index = this.allergenVocabulary.get(allergen.toLowerCase());
      if (index !== undefined && (allergenOffset + index) < this.config.inputSize) {
        features[allergenOffset + index] = 1;
      }
    });
    
    // Encode medications (offset by allergen vocabulary size)
    const medicationOffset = Math.floor(this.config.inputSize * 0.8);
    medications.forEach(medication => {
      const index = this.medicationVocabulary.get(medication.toLowerCase());
      if (index !== undefined && (medicationOffset + index) < this.config.inputSize) {
        features[medicationOffset + index] = 1;
      }
    });
    
    return tf.tensor2d([features]);
  }

  // Train the model
  async trainModel(trainingData: TrainingData[]): Promise<void> {
    console.log('🎯 Training ML model...');
    
    if (trainingData.length === 0) {
      throw new Error('No training data available');
    }

    // Initialize vocabulary
    await this.initializeVocabulary(trainingData);
    
    // Create model
    this.model = this.createModel();
    
    // Prepare training data
    const features: tf.Tensor2D[] = [];
    const labels: number[] = [];
    
    trainingData.forEach(data => {
      const featureTensor = this.textToFeatures(
        data.ingredients,
        data.userAllergies,
        data.userMedications
      );
      features.push(featureTensor);
      
      // Convert risk level to numerical label
      const riskLabels = { safe: 0, caution: 1, danger: 2 };
      labels.push(riskLabels[data.riskLevel]);
    });
    
    // Combine features and labels
    const X = tf.concat(features, 0);
    const y = tf.oneHot(tf.tensor1d(labels, 'int32'), 3);
    
    // Train model
    const history = await this.model.fit(X, y, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
          }
        }
      }
    });
    
    // Clean up tensors
    X.dispose();
    y.dispose();
    features.forEach(f => f.dispose());
    
    console.log('✅ ML model training completed');
    this.isModelLoaded = true;
    
    // Save model
    await this.saveModel();
  }

  // Save trained model
  async saveModel(): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    console.log('💾 Saving ML model...');
    await this.model.save(`file://${this.config.modelPath}`);
    console.log('✅ ML model saved');
  }

  // Load pre-trained model
  async loadModel(): Promise<void> {
    try {
      console.log('📥 Loading pre-trained ML model...');
      this.model = await tf.loadLayersModel(`file://${this.config.modelPath}/model.json`);
      this.isModelLoaded = true;
      console.log('✅ ML model loaded successfully');
    } catch (error) {
      console.log('⚠️ No pre-trained model found, will train from scratch');
      this.isModelLoaded = false;
    }
  }

  // Predict risk level using ML
  async predictRisk(ingredients: string[], allergies: string[], medications: string[]): Promise<{
    riskLevel: 'safe' | 'caution' | 'danger';
    confidence: number;
    allergenAlerts: Array<{ allergen: string; severity: 'low' | 'medium' | 'high'; message: string }>;
    drugInteractions: Array<{ medication: string; ingredient: string; severity: 'low' | 'medium' | 'high'; message: string }>;
  }> {
    if (!this.isModelLoaded || !this.model) {
      throw new Error('ML model not loaded');
    }

    console.log('🔮 Making ML prediction...');
    
    // Convert to features
    const features = this.textToFeatures(ingredients, allergies, medications);
    
    // Make prediction
    const prediction = this.model.predict(features) as tf.Tensor2D;
    const probabilities = await prediction.data();
    
    // Find highest probability class
    const riskLabels = ['safe', 'caution', 'danger'] as const;
    const probabilitiesArray = Array.from(probabilities);
    const maxIndex = probabilitiesArray.indexOf(Math.max(...probabilitiesArray));
    const riskLevel = riskLabels[maxIndex];
    const confidence = probabilitiesArray[maxIndex];
    
    // Generate allergen alerts
    const allergenAlerts = this.generateAllergenAlerts(ingredients, allergies);
    
    // Generate drug interactions
    const drugInteractions = this.generateDrugInteractions(ingredients, medications);
    
    // Clean up tensors
    features.dispose();
    prediction.dispose();
    
    console.log(`🎯 ML Prediction: ${riskLevel} (confidence: ${(confidence * 100).toFixed(1)}%)`);
    
    return {
      riskLevel,
      confidence,
      allergenAlerts,
      drugInteractions
    };
  }

  // Generate allergen alerts using pattern matching
  private generateAllergenAlerts(ingredients: string[], allergies: string[]): Array<{
    allergen: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }> {
    const alerts: Array<{
      allergen: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }> = [];

    allergies.forEach(allergen => {
      const allergenLower = allergen.toLowerCase();
      
      ingredients.forEach(ingredient => {
        const ingredientLower = ingredient.toLowerCase();
        
        // Direct match
        if (ingredientLower.includes(allergenLower)) {
          alerts.push({
            allergen,
            severity: 'high',
            message: `⚠️ Direct allergen match: ${ingredient} contains ${allergen}`
          });
        }
        // Partial match (common allergens)
        else if (this.isPartialAllergenMatch(ingredientLower, allergenLower)) {
          alerts.push({
            allergen,
            severity: 'medium',
            message: `⚠️ Possible allergen: ${ingredient} may contain traces of ${allergen}`
          });
        }
      });
    });

    return alerts;
  }

  // Generate drug interactions using pattern matching
  private generateDrugInteractions(ingredients: string[], medications: string[]): Array<{
    medication: string;
    ingredient: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }> {
    const interactions: Array<{
      medication: string;
      ingredient: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }> = [];

    // Known drug-ingredient interactions
    const knownInteractions: Record<string, string[]> = {
      'warfarin': ['vitamin k', 'green leafy vegetables', 'broccoli', 'spinach'],
      'digoxin': ['licorice', 'st johns wort', 'grapefruit'],
      'statins': ['grapefruit', 'pomegranate'],
      'blood pressure medication': ['licorice', 'grapefruit', 'salt'],
      'diabetes medication': ['alcohol', 'grapefruit']
    };

    medications.forEach(medication => {
      const medicationLower = medication.toLowerCase();
      
      // Check for known interactions
      Object.entries(knownInteractions).forEach(([drug, conflictingIngredients]) => {
        if (medicationLower.includes(drug.toLowerCase())) {
          conflictingIngredients.forEach(conflictingIngredient => {
            ingredients.forEach(ingredient => {
              if (ingredient.toLowerCase().includes(conflictingIngredient)) {
                interactions.push({
                  medication,
                  ingredient,
                  severity: 'high',
                  message: `🚨 Drug interaction: ${ingredient} may interact with ${medication}`
                });
              }
            });
          });
        }
      });
    });

    return interactions;
  }

  // Check for partial allergen matches
  private isPartialAllergenMatch(ingredient: string, allergen: string): boolean {
    const allergenPatterns: Record<string, string[]> = {
      'nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey'],
      'gluten': ['wheat', 'barley', 'rye', 'oats'],
      'soy': ['soybean', 'tofu', 'tempeh', 'miso'],
      'eggs': ['egg', 'albumin', 'lecithin'],
      'fish': ['salmon', 'tuna', 'cod', 'anchovy'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'scallop']
    };

    const patterns = allergenPatterns[allergen.toLowerCase()];
    if (patterns) {
      return patterns.some(pattern => ingredient.includes(pattern));
    }

    return false;
  }

  // Get model status
  getModelStatus(): { isLoaded: boolean; vocabularySize: number; allergenVocabularySize: number; medicationVocabularySize: number } {
    return {
      isLoaded: this.isModelLoaded,
      vocabularySize: this.vocabulary.size,
      allergenVocabularySize: this.allergenVocabulary.size,
      medicationVocabularySize: this.medicationVocabulary.size
    };
  }
}

// Singleton instance
const mlModel = new IngredientAnalysisModel();

// Export functions
export async function initializeMLModel(): Promise<void> {
  try {
    await mlModel.loadModel();
  } catch (error) {
    console.log('⚠️ ML model initialization failed:', error);
  }
}

export async function trainMLModel(trainingData: TrainingData[]): Promise<void> {
  await mlModel.trainModel(trainingData);
}

export async function analyzeIngredientsWithML(
  productData: BarcodeData,
  userAllergies: string[],
  userMedications: string[]
): Promise<AnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Extract ingredients
    const ingredients = productData.ingredients || [];
    
    if (ingredients.length === 0) {
      throw new Error('No ingredients available for analysis');
    }

    // Make ML prediction
    const prediction = await mlModel.predictRisk(ingredients, userAllergies, userMedications);
    
    const analysisTime = Date.now() - startTime;
    console.log(`⚡ ML Analysis completed in ${analysisTime}ms`);
    
    return {
      safe: prediction.riskLevel === 'safe',
      allergenAlerts: prediction.allergenAlerts,
      drugInteractions: prediction.drugInteractions,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      analysisMethod: 'ML',
      analysisTime: analysisTime
    };
    
  } catch (error) {
    console.error('❌ ML analysis failed:', error);
    throw error;
  }
}

export function getMLModelStatus() {
  return mlModel.getModelStatus();
}

export { TrainingData, MLConfig };
