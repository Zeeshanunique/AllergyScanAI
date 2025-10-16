import Database from 'better-sqlite3';
import { 
  initializeMLModel, 
  trainMLModel, 
  analyzeIngredientsWithML, 
  getMLModelStatus,
  TrainingData 
} from './mlAnalysis';
import { 
  extractTrainingDataFromDatabase, 
  generateSyntheticTrainingData, 
  validateTrainingDataQuality,
  exportTrainingDataToFile 
} from './trainingDataPipeline';

// ML Training Service Class
class MLTrainingService {
  private db: Database.Database;
  private isTrainingInProgress = false;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Initialize ML model (load existing or prepare for training)
  async initializeModel(): Promise<{ success: boolean; message: string; status: any }> {
    try {
      console.log('🚀 Initializing ML model...');
      
      await initializeMLModel();
      const status = getMLModelStatus();
      
      if (status.isLoaded) {
        return {
          success: true,
          message: 'ML model loaded successfully',
          status
        };
      } else {
        return {
          success: false,
          message: 'No pre-trained model found. Training required.',
          status
        };
      }
    } catch (error) {
      console.error('❌ ML model initialization failed:', error);
      return {
        success: false,
        message: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        status: null
      };
    }
  }

  // Train ML model with current data
  async trainModel(): Promise<{ success: boolean; message: string; trainingStats?: any }> {
    if (this.isTrainingInProgress) {
      return {
        success: false,
        message: 'Training already in progress'
      };
    }

    try {
      this.isTrainingInProgress = true;
      console.log('🎯 Starting ML model training...');

      // Extract training data from database
      const baseTrainingData = await extractTrainingDataFromDatabase(this.db);
      
      if (baseTrainingData.length === 0) {
        return {
          success: false,
          message: 'No training data available. Please scan some products first.'
        };
      }

      // Validate training data quality
      const validation = validateTrainingDataQuality(baseTrainingData);
      console.log('📊 Training data validation:', validation);

      if (!validation.isValid) {
        console.warn('⚠️ Training data quality issues:', validation.issues);
        console.log('💡 Recommendations:', validation.recommendations);
      }

      // Generate synthetic data for better coverage
      const syntheticData = await generateSyntheticTrainingData(baseTrainingData);
      const allTrainingData = [...baseTrainingData, ...syntheticData];

      console.log(`📈 Total training samples: ${allTrainingData.length} (${baseTrainingData.length} real + ${syntheticData.length} synthetic)`);

      // Export training data for backup
      await exportTrainingDataToFile(allTrainingData, 'ml-training-data.json');

      // Train the model
      const startTime = Date.now();
      await trainMLModel(allTrainingData);
      const trainingTime = Date.now() - startTime;

      // Get final model status
      const finalStatus = getMLModelStatus();

      const trainingStats = {
        trainingTime: trainingTime,
        totalSamples: allTrainingData.length,
        realSamples: baseTrainingData.length,
        syntheticSamples: syntheticData.length,
        vocabularySize: finalStatus.vocabularySize,
        allergenVocabularySize: finalStatus.allergenVocabularySize,
        medicationVocabularySize: finalStatus.medicationVocabularySize,
        validationIssues: validation.issues,
        recommendations: validation.recommendations
      };

      console.log('✅ ML model training completed successfully');
      console.log('📊 Training statistics:', trainingStats);

      return {
        success: true,
        message: `Model trained successfully in ${(trainingTime / 1000).toFixed(1)}s`,
        trainingStats
      };

    } catch (error) {
      console.error('❌ ML model training failed:', error);
      return {
        success: false,
        message: `Training failed: ${error instanceof Error ? error.message : String(error)}`
      };
    } finally {
      this.isTrainingInProgress = false;
    }
  }

  // Validate model performance
  async validateModel(): Promise<{ success: boolean; message: string; performance?: any }> {
    try {
      console.log('🧪 Validating ML model performance...');

      const status = getMLModelStatus();
      if (!status.isLoaded) {
        return {
          success: false,
          message: 'No trained model available for validation'
        };
      }

      // Get test data (recent scans)
      const testQuery = `
        SELECT 
          sh.ingredients,
          sh.analysis_result,
          u.allergies,
          u.medications
        FROM scan_history sh
        JOIN users u ON sh.user_id = u.id
        WHERE sh.ingredients IS NOT NULL 
        AND sh.ingredients != '[]'
        AND sh.analysis_result IS NOT NULL
        ORDER BY sh.scanned_at DESC
        LIMIT 20
      `;

      const testRows = this.db.prepare(testQuery).all() as Array<{
        ingredients: string;
        analysis_result: string;
        allergies: string;
        medications: string;
      }>;

      if (testRows.length === 0) {
        return {
          success: false,
          message: 'No test data available for validation'
        };
      }

      let correctPredictions = 0;
      let totalPredictions = 0;
      const predictionDetails: Array<{
        expected: string;
        predicted: string;
        confidence: number;
        ingredients: string[];
      }> = [];

      // Test each sample
      for (const row of testRows) {
        try {
          const ingredients = JSON.parse(row.ingredients) as string[];
          const analysisResult = JSON.parse(row.analysis_result) as { riskLevel: 'safe' | 'caution' | 'danger' };
          const userAllergies = row.allergies ? JSON.parse(row.allergies) as string[] : [];
          const userMedications = row.medications ? JSON.parse(row.medications) as string[] : [];

          // Make ML prediction
          const prediction = await analyzeIngredientsWithML(
            { ingredients } as any,
            userAllergies,
            userMedications
          );

          const expectedRisk = analysisResult.riskLevel;
          const predictedRisk = prediction.riskLevel;
          const confidence = prediction.confidence || 0;

          predictionDetails.push({
            expected: expectedRisk,
            predicted: predictedRisk,
            confidence,
            ingredients
          });

          if (expectedRisk === predictedRisk) {
            correctPredictions++;
          }
          totalPredictions++;

        } catch (error) {
          console.warn('⚠️ Failed to validate sample:', error);
          continue;
        }
      }

      const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
      const averageConfidence = predictionDetails.reduce((sum, p) => sum + p.confidence, 0) / predictionDetails.length;

      const performance = {
        accuracy: accuracy,
        averageConfidence: averageConfidence,
        totalTestSamples: totalPredictions,
        correctPredictions,
        predictionDetails: predictionDetails.slice(0, 5) // Show first 5 for debugging
      };

      console.log('📊 Model validation results:', performance);

      return {
        success: true,
        message: `Model validation completed. Accuracy: ${accuracy.toFixed(1)}%`,
        performance
      };

    } catch (error) {
      console.error('❌ Model validation failed:', error);
      return {
        success: false,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Get training status
  getTrainingStatus(): { isTrainingInProgress: boolean; modelStatus: any } {
    return {
      isTrainingInProgress: this.isTrainingInProgress,
      modelStatus: getMLModelStatus()
    };
  }

  // Retrain model with new data
  async retrainModel(): Promise<{ success: boolean; message: string; trainingStats?: any }> {
    console.log('🔄 Retraining ML model with latest data...');
    return await this.trainModel();
  }

  // Get model performance metrics
  async getModelMetrics(): Promise<{ success: boolean; metrics?: any }> {
    try {
      const status = getMLModelStatus();
      if (!status.isLoaded) {
        return {
          success: false
        };
      }

      // Get basic metrics from database
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_scans,
          COUNT(CASE WHEN JSON_EXTRACT(analysis_result, '$.riskLevel') = 'safe' THEN 1 END) as safe_scans,
          COUNT(CASE WHEN JSON_EXTRACT(analysis_result, '$.riskLevel') = 'caution' THEN 1 END) as caution_scans,
          COUNT(CASE WHEN JSON_EXTRACT(analysis_result, '$.riskLevel') = 'danger' THEN 1 END) as danger_scans
        FROM scan_history 
        WHERE analysis_result IS NOT NULL
      `;

      const metrics = this.db.prepare(metricsQuery).get() as {
        total_scans: number;
        safe_scans: number;
        caution_scans: number;
        danger_scans: number;
      };

      return {
        success: true,
        metrics: {
          ...status,
          ...metrics,
          safeRatio: metrics.total_scans > 0 ? (metrics.safe_scans / metrics.total_scans) * 100 : 0,
          cautionRatio: metrics.total_scans > 0 ? (metrics.caution_scans / metrics.total_scans) * 100 : 0,
          dangerRatio: metrics.total_scans > 0 ? (metrics.danger_scans / metrics.total_scans) * 100 : 0
        }
      };

    } catch (error) {
      console.error('❌ Failed to get model metrics:', error);
      return {
        success: false
      };
    }
  }
}

// Export functions
export async function initializeMLTrainingService(db: Database.Database): Promise<MLTrainingService> {
  const service = new MLTrainingService(db);
  await service.initializeModel();
  return service;
}

export async function trainMLModelFromDatabase(db: Database.Database): Promise<{ success: boolean; message: string; trainingStats?: any }> {
  const service = new MLTrainingService(db);
  return await service.trainModel();
}

export async function validateMLModelFromDatabase(db: Database.Database): Promise<{ success: boolean; message: string; performance?: any }> {
  const service = new MLTrainingService(db);
  return await service.validateModel();
}

export async function getMLModelMetricsFromDatabase(db: Database.Database): Promise<{ success: boolean; metrics?: any }> {
  const service = new MLTrainingService(db);
  return await service.getModelMetrics();
}

export { MLTrainingService };
