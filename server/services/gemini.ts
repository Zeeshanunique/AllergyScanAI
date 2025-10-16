import { GoogleGenerativeAI } from "@google/generative-ai";
import { BarcodeData } from "./foodApi";
import { analyzeIngredientsWithML, getMLModelStatus } from "./mlAnalysis";

// Initialize Google Gemini AI
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GOOGLE_GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

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

export async function analyzeIngredients(
  productData: BarcodeData,
  userAllergies: string[],
  userMedications: string[]
): Promise<AnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Check if ML model is available and try ML analysis first
    const mlStatus = getMLModelStatus();
    
    if (mlStatus.isLoaded && productData.ingredients && productData.ingredients.length > 0) {
      console.log('🤖 Attempting ML analysis first...');
      
      try {
        const mlResult = await analyzeIngredientsWithML(productData, userAllergies, userMedications);
        
        // If ML confidence is high enough, use ML result
        if (mlResult.confidence && mlResult.confidence > 0.8) {
          console.log(`✅ Using ML analysis (confidence: ${(mlResult.confidence * 100).toFixed(1)}%)`);
          return {
            ...mlResult,
            analysisMethod: 'ML',
            analysisTime: Date.now() - startTime
          };
        }
        
        // If ML confidence is medium, use hybrid approach
        if (mlResult.confidence && mlResult.confidence > 0.6) {
          console.log(`🔄 Using hybrid analysis (ML confidence: ${(mlResult.confidence * 100).toFixed(1)}%)`);
          
          // Get LLM analysis for comparison
          const llmResult = await analyzeIngredientsWithLLM(productData, userAllergies, userMedications);
          
          // Combine results (ML for structure, LLM for detailed explanations)
          return {
            safe: mlResult.safe,
            riskLevel: mlResult.riskLevel,
            allergenAlerts: mlResult.allergenAlerts.length > 0 ? mlResult.allergenAlerts : llmResult.allergenAlerts,
            drugInteractions: mlResult.drugInteractions.length > 0 ? mlResult.drugInteractions : llmResult.drugInteractions,
            confidence: mlResult.confidence,
            analysisMethod: 'Hybrid',
            analysisTime: Date.now() - startTime
          };
        }
        
        console.log(`⚠️ ML confidence too low (${(mlResult.confidence || 0) * 100}%), falling back to LLM`);
        
      } catch (mlError) {
        console.warn('⚠️ ML analysis failed, falling back to LLM:', mlError);
      }
    }
    
    // Fallback to LLM analysis
    console.log('🧠 Using LLM analysis...');
    const llmResult = await analyzeIngredientsWithLLM(productData, userAllergies, userMedications);
    
    return {
      ...llmResult,
      analysisMethod: 'LLM',
      analysisTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Separate LLM analysis function
async function analyzeIngredientsWithLLM(
  productData: BarcodeData,
  userAllergies: string[],
  userMedications: string[]
): Promise<AnalysisResult> {
  const prompt = `
    Analyze the following food product for potential health risks:
    
    PRODUCT INFORMATION:
    - Product Name: ${productData.productName || 'Not specified'}
    - Brand: ${productData.brand || 'Not specified'}
    - Category: ${productData.category || 'Not specified'}
    - Description: ${productData.description || 'Not specified'}
    - Ingredients: ${productData.ingredients.join(', ') || 'Not specified'}
    - Known Allergens: ${productData.allergens?.join(', ') || 'None listed'}
    
    USER PROFILE:
    - User Allergies: ${userAllergies.join(', ') || 'None'}
    - User Medications: ${userMedications.join(', ') || 'None'}
    
    ANALYSIS REQUIREMENTS:
    1. **Allergen Analysis**: Check for direct allergen matches and potential cross-contamination risks
    2. **Drug Interactions**: Identify potential food-drug interactions with current medications
    3. **Product Safety**: Assess overall safety based on product type, ingredients, and processing
    4. **Hidden Risks**: Look for hidden allergens, additives, or processing methods that could pose risks
    
    SPECIAL CONSIDERATIONS:
    - If ingredients are limited or generic (like "protein supplement"), analyze based on product type and description
    - Consider supplement-specific risks (contamination, heavy metals, interactions)
    - Account for processing methods that might introduce allergens
    - Evaluate brand reputation and manufacturing practices when relevant
    
    Respond with a JSON object containing:
    {
      "safe": boolean,
      "allergenAlerts": [
        {
          "allergen": "allergen name",
          "severity": "low|medium|high",
          "message": "detailed explanation of risk and why it's concerning"
        }
      ],
      "drugInteractions": [
        {
          "medication": "medication name",
          "ingredient": "problematic ingredient",
          "severity": "low|medium|high", 
          "message": "interaction details and potential effects"
        }
      ],
      "riskLevel": "safe|caution|danger"
    }
    
    IMPORTANT: 
    - Be thorough in checking for hidden allergens and cross-contamination risks
    - Provide specific, actionable information
    - Respond ONLY with valid JSON, no additional text or formatting
    - If product information is limited, indicate uncertainty in the analysis
  `;

  try {
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to ensure it's valid JSON
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedResult = JSON.parse(cleanedText);
    
    return parsedResult as AnalysisResult;
  } catch (error) {
    console.error('Gemini analysis error:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Invalid or missing Google Gemini API key');
    }
    throw new Error('Failed to analyze ingredients');
  }
}

export async function chatWithAI(
  message: string, 
  userId: string, 
  userContext?: {
    firstName?: string;
    allergies: string[];
    medications: string[];
    recentScans?: Array<{
      productName?: string;
      ingredients: string[];
      analysisResult: any;
      scannedAt: Date;
    }>;
  }
): Promise<string> {
  // Build personalized context
  let contextInfo = "";
  
  if (userContext) {
    const { firstName, allergies, medications, recentScans } = userContext;
    
    if (firstName) {
      contextInfo += `User's name: ${firstName}\n`;
    }
    
    if (allergies && allergies.length > 0) {
      contextInfo += `User's known allergies: ${allergies.join(', ')}\n`;
    }
    
    if (medications && medications.length > 0) {
      contextInfo += `User's current medications: ${medications.join(', ')}\n`;
    }
    
    if (recentScans && recentScans.length > 0) {
      contextInfo += `Recent scan history (last 3 scans):\n`;
      recentScans.slice(0, 3).forEach((scan, index) => {
        contextInfo += `${index + 1}. ${scan.productName || 'Unknown Product'} - `;
        contextInfo += `Risk Level: ${scan.analysisResult?.riskLevel || 'unknown'}, `;
        contextInfo += `Scanned: ${scan.scannedAt.toLocaleDateString()}\n`;
      });
    }
  }

  const prompt = `
    You are a personalized AI assistant specializing in food safety and nutrition. You have access to the user's allergy profile, medications, and scan history. Provide accurate, helpful, and personalized guidance while recommending professional medical advice for serious health concerns. Always be warm and conversational, using the user's name when you know it.

    ${contextInfo ? `USER CONTEXT:\n${contextInfo}\n` : ''}
    USER QUESTION: ${message}
    
    Please provide helpful, personalized information about food safety, allergens, 
    medication interactions, or general nutrition guidance. Be conversational, 
    use the user's name when appropriate, and reference their specific allergies 
    and medications when relevant. If the question requires specific medical advice, 
    recommend consulting a healthcare professional.
    
    ${contextInfo ? 'IMPORTANT: Use the user context above to provide personalized, relevant advice.' : ''}
    
    FORMATTING INSTRUCTIONS:
    - Use clear headings with **bold text** for main sections
    - Use bullet points with • for lists
    - Use numbered lists (1., 2., 3.) for step-by-step instructions
    - Use line breaks between sections for better readability
    - Keep paragraphs concise and easy to scan
    - Use emojis sparingly but appropriately (🍳 for cooking, ⚠️ for warnings, etc.)
    
    Example format:
    **Main Topic**
    
    • First bullet point
    • Second bullet point
    • Third bullet point
    
    **Next Section**
    
    More detailed explanation here...
  `;

  try {
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error('Gemini chat error:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Invalid or missing Google Gemini API key');
    }
    throw new Error('Failed to get AI response');
  }
}

export async function extractBarcodeFromImage(imageData: string): Promise<string | null> {
  try {
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    console.log('Using Gemini Vision API to extract barcode from image...');
    console.log('Image data length:', imageData.length);
    console.log('Image data starts with:', imageData.substring(0, 50));

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      throw new Error('Invalid image data format. Expected data:image/... format');
    }

    // Extract base64 data and MIME type
    const [header, base64Data] = imageData.split(',');
    if (!base64Data) {
      throw new Error('No base64 data found in image');
    }

    // Extract MIME type from header
    const mimeTypeMatch = header.match(/data:image\/([^;]+)/);
    const mimeType = mimeTypeMatch ? `image/${mimeTypeMatch[1]}` : 'image/jpeg';
    
    console.log('Detected MIME type:', mimeType);
    console.log('Base64 data length:', base64Data.length);

    // Validate base64 data
    if (base64Data.length < 100) {
      throw new Error('Image data too small, likely invalid');
    }

    // Create a vision model for image analysis
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

    const prompt = `
    Analyze this image and extract any barcode numbers you can see. 
    
    Look specifically for:
    - 13-digit product barcodes (EAN-13 format)
    - 12-digit UPC barcodes
    - Any sequence of 10-15 digits that appears to be a product barcode
    
    IMPORTANT:
    - Only return the numeric barcode, nothing else
    - If you see multiple numbers, return the longest sequence that looks like a barcode
    - If no barcode is visible, return "NO_BARCODE"
    - Do not return URLs, QR codes, or other non-barcode text
    - Focus on the numbers printed below or above barcode lines
    
    Return format: Just the barcode number (e.g., "8906067024954") or "NO_BARCODE"
    `;

    const result = await visionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const extractedText = response.text().trim();
    
    console.log('Gemini Vision extracted text:', extractedText);

    // Clean up the response
    const cleanedText = extractedText.replace(/[^\d]/g, '');
    
    if (cleanedText.length >= 10 && cleanedText.length <= 15) {
      console.log('✅ Valid barcode extracted:', cleanedText);
      return cleanedText;
    } else if (extractedText.includes('NO_BARCODE')) {
      console.log('❌ No barcode detected in image');
      return null;
    } else {
      console.log('⚠️ Invalid barcode format extracted:', cleanedText);
      return null;
    }

  } catch (error) {
    console.error('Gemini Vision barcode extraction error:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Invalid or missing Google Gemini API key');
    }
    throw new Error('Failed to extract barcode from image');
  }
}
