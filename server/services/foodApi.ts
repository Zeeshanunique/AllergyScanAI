export interface BarcodeData {
  productName?: string;
  brand?: string;
  ingredients: string[];
  allergens?: string[];
  category?: string;
  manufacturer?: string;
  description?: string;
  image?: string;
}

// Barcode Lookup API response interface
interface BarcodeLookupProduct {
  barcode_number: string;
  title: string;
  category: string;
  manufacturer: string;
  brand: string;
  ingredients: string;
  nutrition_facts: string;
  description: string;
  images: string[];
}

interface BarcodeLookupResponse {
  products: BarcodeLookupProduct[];
}

function isValidBarcode(barcode: string): boolean {
  // Remove any whitespace
  const cleanBarcode = barcode.trim();
  
  // Reject empty or very short barcodes
  if (!cleanBarcode || cleanBarcode.length < 3) {
    return false;
  }
  
  // Reject URLs (http/https)
  if (cleanBarcode.startsWith('http://') || cleanBarcode.startsWith('https://')) {
    return false;
  }
  
  // Reject email addresses
  if (cleanBarcode.includes('@') && cleanBarcode.includes('.')) {
    return false;
  }
  
  // Reject QR codes that contain URLs (common pattern)
  if (cleanBarcode.includes('://') || cleanBarcode.includes('www.')) {
    return false;
  }
  
  // Accept numeric barcodes (UPC, EAN, ISBN)
  if (/^\d+$/.test(cleanBarcode)) {
    return true;
  }
  
  // Accept alphanumeric codes (some product codes)
  if (/^[A-Za-z0-9]+$/.test(cleanBarcode)) {
    return true;
  }
  
  // Reject anything else (special characters, spaces, etc.)
  return false;
}

export async function getBarcodeData(barcode: string): Promise<BarcodeData> {
  // Validate barcode format - reject URLs, QR codes with URLs, and invalid formats
  if (!isValidBarcode(barcode)) {
    throw new Error('Invalid barcode format. Please scan a valid product barcode (UPC, EAN, ISBN, etc.)');
  }

  // API Key - in production, this should be in environment variables
  const API_KEY = process.env.BARCODE_LOOKUP_API_KEY || '7fe7fdccv0kqpv12f7bswv4lnxn2ee';
  
  // Using Barcode Lookup API
  const response = await fetch(
    `https://api.barcodelookup.com/v3/products?barcode=${barcode}&formatted=y&key=${API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data: BarcodeLookupResponse = await response.json();
  
  if (!data.products || data.products.length === 0) {
    throw new Error('Product not found');
  }

  const product = data.products[0];
  
  // Extract and parse ingredients
  let ingredients: string[] = [];
  if (product.ingredients && product.ingredients.trim()) {
    ingredients = product.ingredients
      .split(/[,;]/)
      .map((ingredient: string) => ingredient.trim())
      .filter((ingredient: string) => ingredient.length > 0);
  }
  
  // If no ingredients in the ingredients field, try to extract from nutrition_facts or description
  if (ingredients.length === 0 && product.nutrition_facts) {
    // Try to extract ingredients from nutrition facts
    const nutritionText = product.nutrition_facts.toLowerCase();
    const ingredientsMatch = nutritionText.match(/ingredients?[:\s]+(.*?)(?:\n|$)/i);
    if (ingredientsMatch) {
      ingredients = ingredientsMatch[1]
        .split(/[,;]/)
        .map((ingredient: string) => ingredient.trim())
        .filter((ingredient: string) => ingredient.length > 0);
    }
  }
  
  // If still no ingredients, extract from description and title for food products
  if (ingredients.length === 0) {
    const extractedInfo = extractIngredientsFromText(product.title, product.description, product.category);
    ingredients = extractedInfo;
  }

  // Extract potential allergens from ingredients
  const allergens: string[] = [];
  const commonAllergens = [
    'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans', 'sesame'
  ];
  
  ingredients.forEach(ingredient => {
    const lowerIngredient = ingredient.toLowerCase();
    commonAllergens.forEach(allergen => {
      if (lowerIngredient.includes(allergen)) {
        if (!allergens.includes(allergen)) {
          allergens.push(allergen);
        }
      }
    });
  });

  return {
    productName: product.title,
    brand: product.brand || product.manufacturer,
    ingredients,
    allergens,
    category: product.category,
    manufacturer: product.manufacturer,
    description: product.description,
    image: product.images && product.images.length > 0 ? product.images[0] : undefined
  };
}

function extractIngredientsFromText(title: string, description: string, category: string): string[] {
  const extractedIngredients: string[] = [];
  const text = `${title} ${description}`.toLowerCase();
  
  // Common food ingredients and their variations
  const ingredientPatterns = [
    // Proteins
    { pattern: /whey protein|protein concentrate|protein isolate|casein|soy protein|pea protein|rice protein/i, ingredient: 'protein powder' },
    { pattern: /milk|dairy|lactose|cream|butter|cheese/i, ingredient: 'dairy' },
    { pattern: /egg|albumen|yolk/i, ingredient: 'eggs' },
    
    // Grains and carbs
    { pattern: /wheat|flour|bread|cereal|oats|rice|barley/i, ingredient: 'grains' },
    { pattern: /sugar|sucrose|fructose|glucose|dextrose/i, ingredient: 'sugar' },
    { pattern: /starch|corn starch|potato starch/i, ingredient: 'starch' },
    
    // Fats and oils
    { pattern: /oil|fat|glycerin|lecithin/i, ingredient: 'fats/oils' },
    { pattern: /coconut|coconut oil/i, ingredient: 'coconut' },
    { pattern: /palm oil/i, ingredient: 'palm oil' },
    
    // Nuts and seeds
    { pattern: /almond|walnut|cashew|pistachio|hazelnut|pecan/i, ingredient: 'tree nuts' },
    { pattern: /peanut|groundnut/i, ingredient: 'peanuts' },
    { pattern: /sesame|tahini/i, ingredient: 'sesame' },
    
    // Additives and preservatives
    { pattern: /preservative|preserved|sodium benzoate|potassium sorbate/i, ingredient: 'preservatives' },
    { pattern: /artificial|synthetic|additive/i, ingredient: 'artificial additives' },
    { pattern: /flavor|flavouring|natural flavor/i, ingredient: 'flavorings' },
    
    // Vitamins and minerals
    { pattern: /vitamin|mineral|calcium|iron|zinc|magnesium/i, ingredient: 'vitamins/minerals' },
    
    // Chocolate and cocoa
    { pattern: /chocolate|cocoa|cacao/i, ingredient: 'chocolate/cocoa' },
    
    // Fruits and vegetables
    { pattern: /fruit|berry|apple|banana|orange/i, ingredient: 'fruits' },
    { pattern: /vegetable|carrot|spinach|broccoli/i, ingredient: 'vegetables' },
  ];
  
  // Extract ingredients based on patterns
  ingredientPatterns.forEach(({ pattern, ingredient }) => {
    if (pattern.test(text) && !extractedIngredients.includes(ingredient)) {
      extractedIngredients.push(ingredient);
    }
  });
  
  // If no specific ingredients found, try to determine product type
  if (extractedIngredients.length === 0) {
    if (text.includes('protein') || text.includes('supplement')) {
      extractedIngredients.push('protein supplement', 'supplement ingredients');
    } else if (text.includes('snack') || text.includes('candy')) {
      extractedIngredients.push('snack ingredients', 'processed food');
    } else if (text.includes('drink') || text.includes('beverage')) {
      extractedIngredients.push('beverage ingredients', 'liquid supplement');
    } else if (category && category.toLowerCase().includes('food')) {
      extractedIngredients.push('food product', 'processed ingredients');
    } else {
      extractedIngredients.push('product ingredients not specified');
    }
  }
  
  return extractedIngredients;
}

export function parseIngredientsText(text: string): string[] {
  // Parse manually entered ingredients
  return text
    .split(/[,\n]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 0);
}
