export interface BarcodeData {
  productName?: string;
  brand?: string;
  ingredients: string[];
  allergens?: string[];
}

export async function getBarcodeData(barcode: string): Promise<BarcodeData> {
  try {
    // Using Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (!data.product) {
      throw new Error('Product not found');
    }

    const product = data.product;
    
    // Extract ingredients from the product data
    const ingredientsText = product.ingredients_text || '';
    const ingredients = ingredientsText
      .split(/[,;]/)
      .map((ingredient: string) => ingredient.trim())
      .filter((ingredient: string) => ingredient.length > 0);

    // Extract allergens
    const allergens = product.allergens_tags || [];

    return {
      productName: product.product_name || product.generic_name,
      brand: product.brands,
      ingredients,
      allergens: allergens.map((allergen: string) => allergen.replace('en:', ''))
    };
  } catch (error) {
    console.error('Food API error:', error);
    throw new Error('Failed to fetch product data');
  }
}

export function parseIngredientsText(text: string): string[] {
  // Parse manually entered ingredients
  return text
    .split(/[,\n]/)
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 0);
}
