import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant specializing in food safety, allergens, and drug interactions. Provide accurate, detailed analysis of food ingredients against user health profiles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as AnalysisResult;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw new Error('Failed to analyze ingredients');
  }
}

export async function chatWithAI(message: string, userId: string): Promise<string> {
  const prompt = `
    User question about food safety: ${message}
    
    Please provide helpful, accurate information about food safety, allergens, 
    medication interactions, or general nutrition guidance. Be conversational 
    but medically accurate. If the question requires specific medical advice, 
    recommend consulting a healthcare professional.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant specializing in food safety and nutrition. Provide accurate, helpful guidance while recommending professional medical advice for serious health concerns."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new Error('Failed to get AI response');
  }
}
