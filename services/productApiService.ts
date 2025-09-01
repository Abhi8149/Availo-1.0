import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export interface ProductData {
  name: string;
  brand?: string;
  price?: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  source: 'local' | 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | 'openfda' | 'upcitemdb' | 'freewebapi' | 'goupc' | 'googlebooks' | 'openlibrary' | 'manual';
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
      { name: 'openfda', fn: this.checkOpenFDA },
      { name: 'upcitemdb', fn: this.checkUPCItemDB },
      { name: 'freewebapi', fn: this.checkFreeWebAPI },
      { name: 'goupc', fn: this.checkGoUPC },
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
      
      if (!response.ok) {
        return { name: '', source: 'openfoodfacts', found: false };
      }
      
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
      console.log(`Open Food Facts error (skipping): ${error}`);
      return { name: '', source: 'openfoodfacts', found: false };
    }
  }

  /**
   * Open Beauty Facts API
   */
  private static async checkOpenBeautyFacts(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
      
      if (!response.ok) {
        return { name: '', source: 'openbeautyfacts', found: false };
      }
      
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
      console.log(`Open Beauty Facts error (skipping): ${error}`);
      return { name: '', source: 'openbeautyfacts', found: false };
    }
  }

  /**
   * Open Product Facts API
   */
  private static async checkOpenProductFacts(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://world.openproductsfacts.org/api/v2/product/${barcode}.json`);
      
      if (!response.ok) {
        return { name: '', source: 'openproductsfacts', found: false };
      }
      
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
      console.log(`Open Product Facts error (skipping): ${error}`);
      return { name: '', source: 'openproductsfacts', found: false };
    }
  }

  /**
   * Google Books API
   */
  private static async checkGoogleBooks(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${barcode}`);
      
      if (!response.ok) {
        return { name: '', source: 'googlebooks', found: false };
      }
      
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
      console.log(`Google Books error (skipping): ${error}`);
      return { name: '', source: 'googlebooks', found: false };
    }
  }

  /**
   * Open Library API
   */
  private static async checkOpenLibrary(barcode: string): Promise<ProductData> {
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`);
      
      if (!response.ok) {
        return { name: '', source: 'openlibrary', found: false };
      }
      
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
      console.log(`Open Library error (skipping): ${error}`);
      return { name: '', source: 'openlibrary', found: false };
    }
  }

  /**
   * OpenFDA API (for medicines/drugs)
   */
  private static async checkOpenFDA(barcode: string): Promise<ProductData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.package_ndc:${barcode}&limit=1`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { name: '', source: 'openfda', found: false };
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const drug = data.results[0];
        return {
          name: drug.openfda?.brand_name?.[0] || drug.openfda?.generic_name?.[0] || '',
          brand: drug.openfda?.manufacturer_name?.[0] || '',
          category: 'medicine',
          description: drug.description?.[0] || drug.indications_and_usage?.[0] || '',
          source: 'openfda',
          found: true
        };
      }
      
      return { name: '', source: 'openfda', found: false };
    } catch (error) {
      console.log(`OpenFDA error (skipping): ${error}`);
      return { name: '', source: 'openfda', found: false };
    }
  }

  /**
   * UPCitemdb API (general retail, free tier)
   */
  private static async checkUPCItemDB(barcode: string): Promise<ProductData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { name: '', source: 'upcitemdb', found: false };
      }
      
      const data = await response.json();
      
      if (data.code === "OK" && data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          name: item.title || '',
          brand: item.brand || '',
          category: item.category || 'retail',
          description: item.description || '',
          imageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
          source: 'upcitemdb',
          found: true
        };
      }
      
      return { name: '', source: 'upcitemdb', found: false };
    } catch (error) {
      console.log(`UPCitemdb error (skipping): ${error}`);
      return { name: '', source: 'upcitemdb', found: false };
    }
  }

  /**
   * FreeWebApi Barcode Lookup (general retail, free)
   */
  private static async checkFreeWebAPI(barcode: string): Promise<ProductData> {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`https://api.freewebapi.com/barcode-lookup?code=${barcode}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; BarcodeScanner/1.0)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`FreeWebAPI returned status: ${response.status}`);
        return { name: '', source: 'freewebapi', found: false };
      }
      
      const data = await response.json();
      
      if (data.success && data.product) {
        const product = data.product;
        return {
          name: product.name || product.title || '',
          brand: product.brand || product.manufacturer || '',
          category: product.category || 'retail',
          description: product.description || '',
          imageUrl: product.image_url || product.image,
          source: 'freewebapi',
          found: true
        };
      }
      
      return { name: '', source: 'freewebapi', found: false };
    } catch (error) {
      console.log(`FreeWebAPI error (skipping): ${error}`);
      // Return false instead of throwing to continue with other APIs
      return { name: '', source: 'freewebapi', found: false };
    }
  }

  /**
   * Go-UPC API (trial, general retail)
   */
  private static async checkGoUPC(barcode: string): Promise<ProductData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://go-upc.com/api/v1/code/${barcode}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { name: '', source: 'goupc', found: false };
      }
      
      const data = await response.json();
      
      if (data.codeType && data.product) {
        const product = data.product;
        return {
          name: product.name || '',
          brand: product.brand || '',
          category: product.category || 'retail',
          description: product.description || '',
          imageUrl: product.imageUrl,
          source: 'goupc',
          found: true
        };
      }
      
      return { name: '', source: 'goupc', found: false };
    } catch (error) {
      console.log(`Go-UPC error (skipping): ${error}`);
      return { name: '', source: 'goupc', found: false };
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
