import { GoogleGenerativeAI } from "@google/generative-ai";

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
}

export async function analyzeIngredients(
  ingredients: string[],
  userAllergies: string[],
  userMedications: string[]
): Promise<AnalysisResult> {
  const prompt = `
    Analyze the following food ingredients for potential health risks:
    
    Ingredients: ${ingredients.join(', ')}
    User Allergies: ${userAllergies.join(', ')}
    User Medications: ${userMedications.join(', ')}
    
    Please analyze for:
    1. Allergen matches and cross-contamination risks
    2. Food-drug interactions with current medications
    3. Overall safety assessment
    
    Respond with a JSON object containing:
    {
      "safe": boolean,
      "allergenAlerts": [
        {
          "allergen": "allergen name",
          "severity": "low|medium|high",
          "message": "detailed explanation"
        }
      ],
      "drugInteractions": [
        {
          "medication": "medication name",
          "ingredient": "problematic ingredient",
          "severity": "low|medium|high", 
          "message": "interaction details"
        }
      ],
      "riskLevel": "safe|caution|danger"
    }
    
    Be thorough in checking for hidden allergens and cross-contamination risks.
    IMPORTANT: Respond ONLY with valid JSON, no additional text or formatting.
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
