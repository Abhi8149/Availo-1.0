import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export interface ProductData {
  name: string;
  brand?: string;
  price?: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  source: 'local' | 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | 'googlebooks' | 'openlibrary' | 'manual';
  found: boolean;
}

export interface ApiResponse {
  success: boolean;
  data?: ProductData;
  error?: string;
}

/**
 * Universal Product API Service
 * Handles product lookup from multiple sources with fallback mechanism
 */
export class ProductApiService {
  
  /**
   * Main function to get product details with smart fallback
   */
  static async getProductDetails(barcode: string, convex: any): Promise<ProductData> {
    try {
      // Step 1: Check local database first
      console.log(`🔍 Checking local database for barcode: ${barcode}`);
      const localProduct = await this.checkLocalDatabase(barcode, convex);
      if (localProduct.found) {
        console.log('✅ Found in local database');
        return localProduct;
      }

      // Step 2: Try external APIs in order
      console.log('🌐 Checking external APIs...');
      const externalProduct = await this.tryExternalApis(barcode);
      if (externalProduct.found) {
        console.log(`✅ Found in ${externalProduct.source}`);
        // Save to local database for future use
        await this.saveToLocalDatabase(barcode, externalProduct, convex);
        return externalProduct;
      }

      // Step 3: Not found anywhere
      console.log('❌ Product not found in any API');
      return {
        name: '',
        brand: '',
        category: '',
        description: '',
        source: 'manual',
        found: false
      };

    } catch (error) {
      console.error('Error in getProductDetails:', error);
      return {
        name: '',
        brand: '',
        category: '',
        description: '',
        source: 'manual',
        found: false
      };
    }
  }

  /**
   * Check local database for existing product
   */
  private static async checkLocalDatabase(barcode: string, convex: any): Promise<ProductData> {
    try {
      const item = await convex.query(api.items.getItemByBarcode, { barcode });
      
      if (item) {
        return {
          name: item.name || '',
          brand: item.brand || '',
          price: item.price,
          category: item.category || '',
          description: item.description || '',
          source: 'local',
          found: true
        };
      }
      
      return { name: '', source: 'local', found: false };
    } catch (error) {
      console.error('Error checking local database:', error);
      return { name: '', source: 'local', found: false };
    }
  }

  /**
   * Try external APIs in sequence (public method for fallback use)
   */
  static async tryExternalApis(barcode: string): Promise<ProductData> {
    const apis = [
      { name: 'openfoodfacts', fn: this.checkOpenFoodFacts },
      { name: 'openbeautyfacts', fn: this.checkOpenBeautyFacts },
      { name: 'openproductsfacts', fn: this.checkOpenProductFacts },
      { name: 'googlebooks', fn: this.checkGoogleBooks },
      { name: 'openlibrary', fn: this.checkOpenLibrary },
    ];

    for (const apiConfig of apis) {
      try {
        console.log(`Trying ${apiConfig.name}...`);
        const result = await apiConfig.fn(barcode);
        if (result.found) {
          return { ...result, source: apiConfig.name as any };
        }
      } catch (error) {
        console.error(`Error with ${apiConfig.name}:`, error);
        continue;
      }
    }

    return { name: '', source: 'manual', found: false };
  }

  /**
   * Open Food Facts API
   */
  private static async checkOpenFoodFacts(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        return {
          name: product.product_name || product.product_name_en || product.generic_name || '',
          brand: product.brands || '',
          category: 'food',
          description: product.ingredients_text || '',
          imageUrl: product.image_url,
          source: 'openfoodfacts',
          found: true
        };
      }
      
      return { name: '', source: 'openfoodfacts', found: false };
    } catch (error) {
      throw new Error(`Open Food Facts API error: ${error}`);
    }
  }

  /**
   * Open Beauty Facts API
   */
  private static async checkOpenBeautyFacts(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        return {
          name: product.product_name || product.product_name_en || '',
          brand: product.brands || '',
          category: 'personal care',
          description: product.ingredients_text || '',
          imageUrl: product.image_url,
          source: 'openbeautyfacts',
          found: true
        };
      }
      
      return { name: '', source: 'openbeautyfacts', found: false };
    } catch (error) {
      throw new Error(`Open Beauty Facts API error: ${error}`);
    }
  }

  /**
   * Open Product Facts API
   */
  private static async checkOpenProductFacts(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://world.openproductsfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        return {
          name: product.product_name || product.product_name_en || '',
          brand: product.brands || '',
          category: 'other',
          description: product.description || '',
          imageUrl: product.image_url,
          source: 'openproductsfacts',
          found: true
        };
      }
      
      return { name: '', source: 'openproductsfacts', found: false };
    } catch (error) {
      throw new Error(`Open Product Facts API error: ${error}`);
    }
  }

  /**
   * Google Books API
   */
  private static async checkGoogleBooks(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          name: book.title || '',
          brand: book.authors ? book.authors.join(', ') : '',
          category: 'books',
          description: book.description || '',
          imageUrl: book.imageLinks?.thumbnail,
          source: 'googlebooks',
          found: true
        };
      }
      
      return { name: '', source: 'googlebooks', found: false };
    } catch (error) {
      throw new Error(`Google Books API error: ${error}`);
    }
  }

  /**
   * Open Library API
   */
  private static async checkOpenLibrary(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`);
      const data = await response.json();
      
      const bookKey = `ISBN:${barcode}`;
      if (data[bookKey]) {
        const book = data[bookKey];
        return {
          name: book.title || '',
          brand: book.authors ? book.authors.map((a: any) => a.name).join(', ') : '',
          category: 'books',
          description: book.subtitle || '',
          imageUrl: book.cover?.medium || book.cover?.large,
          source: 'openlibrary',
          found: true
        };
      }
      
      return { name: '', source: 'openlibrary', found: false };
    } catch (error) {
      throw new Error(`Open Library API error: ${error}`);
    }
  }

  /**
   * Save product to local database for future use
   */
  private static async saveToLocalDatabase(barcode: string, productData: ProductData, convex: any): Promise<void> {
    try {
      // This will be used to save API-fetched products to local database
      // We don't actually save here to avoid duplicates with user-created items
      console.log(`💾 Product data available for saving: ${productData.name} from ${productData.source}`);
    } catch (error) {
      console.error('Error saving to local database:', error);
    }
  }

  /**
   * Save manually entered product to database
   */
  static async saveManualProduct(
    barcode: string, 
    productData: Partial<ProductData>, 
    shopId: Id<"shops">,
    convex: any
  ): Promise<boolean> {
    try {
      await convex.mutation(api.items.createItem, {
        shopId,
        name: productData.name || 'Unknown Product',
        description: productData.description || '',
        price: productData.price,
        category: productData.category || 'other',
        barcode: barcode,
        brand: productData.brand || '',
        inStock: true,
      });
      
      console.log('✅ Manual product saved to database');
      return true;
    } catch (error) {
      console.error('Error saving manual product:', error);
      return false;
    }
  }
}
