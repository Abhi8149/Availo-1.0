/**
 * ====================================================================
 * CLOUDINARY MIGRATION SCRIPT
 * ====================================================================
 * 
 * PURPOSE:
 * Migrates all images and videos from Convex file storage to Cloudinary CDN
 * 
 * WHAT IT DOES:
 * 1. Downloads images/videos from Convex storage URLs
 * 2. Uploads them to Cloudinary with auto-optimization
 * 3. Updates database records with new Cloudinary URLs
 * 4. Preserves original Convex files as backup
 * 
 * ENTITIES MIGRATED:
 * - Shops: shopImageIds[] (multiple shop photos)
 * - Items: imageIds[] or imageId (product images)
 * - Advertisements: imageIds[] and videoIds[] (ad media)
 * 
 * SAFETY FEATURES:
 * - Skips already-migrated items (checks for cloudinary URLs)
 * - Detailed error logging for each failed item
 * - Non-destructive (original files remain in Convex)
 * - Progress tracking with counts
 * 
 * PREREQUISITES:
 * - npm install convex form-data node-fetch@2
 * - Cloudinary account with upload preset configured
 * - Convex backend must have files:getStorageUrl query function
 * 
 * ====================================================================
 */

const { ConvexHttpClient } = require("convex/browser");
const fetch = require("node-fetch");
const FormData = require("form-data");

// ===== CONFIGURATION =====
// Replace with your actual values
const CONVEX_URL = "https://helpful-ermine-601.convex.cloud"; 
const CLOUDINARY_CLOUD_NAME = "dsfzajwpa";
const CLOUDINARY_UPLOAD_PRESET = "Availo_unsigned";

// Initialize Convex client for database operations
const client = new ConvexHttpClient(CONVEX_URL);

/**
 * ====================================================================
 * FUNCTION: uploadToCloudinary
 * ====================================================================
 * 
 * Uploads an image buffer to Cloudinary with optimization settings
 * 
 * PARAMETERS:
 * @param {Buffer} imageBuffer - Raw image data downloaded from Convex
 * @param {string} folder - Cloudinary folder name (shops/items/advertisements)
 * @param {string} filename - Original filename for the image
 * 
 * RETURNS:
 * @returns {string|null} - Cloudinary secure URL or null on failure
 * 
 * CLOUDINARY SETTINGS:
 * - quality: auto (automatically optimizes image quality)
 * - fetch_format: auto (serves WebP/AVIF to supported browsers)
 * - folder: goshop/{folder} (organizes files in Cloudinary)
 * 
 * ERROR HANDLING:
 * - Logs error message without crashing
 * - Returns null to allow script to continue with other images
 * ====================================================================
 */
async function uploadToCloudinary(imageBuffer, folder, filename) {
  try {
    // Create multipart form data for Cloudinary API
    const formData = new FormData();
    formData.append('file', imageBuffer, { filename });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `Availo/${folder}`); // Organize by entity type
    formData.append('quality', 'auto'); // Auto quality optimization
    formData.append('fetch_format', 'auto'); // Auto format (WebP/AVIF)

    // Upload to Cloudinary image endpoint
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('Cloudinary upload failed:', data.error?.message || response.statusText);
      return null;
    }
    
    // Return the secure HTTPS URL for the uploaded image
    return data.secure_url;
  } catch (error) {
    console.error('Upload error:', error.message);
    return null;
  }
}

/**
 * ====================================================================
 * FUNCTION: migrateShops
 * ====================================================================
 * 
 * Migrates all shop images from Convex to Cloudinary
 * 
 * PROCESS:
 * 1. Fetch all shops from database using shops:getAllShops query
 * 2. For each shop:
 *    - Check if already migrated (URL starts with cloudinary domain)
 *    - Download each image from Convex storage
 *    - Upload to Cloudinary in 'shops' folder
 *    - Update shop record with new URLs
 * 3. Track statistics (migrated/skipped/errors)
 * 
 * DATABASE UPDATES:
 * - shopImageIds: array of Cloudinary URLs
 * - shopImageId: first URL (for backward compatibility)
 * 
 * NAMING PATTERN:
 * - shop_{shopId}_{index}.jpg (e.g., shop_abc123_0.jpg)
 * 
 * ERROR HANDLING:
 * - Continues on individual shop failures
 * - Logs shop name and error message
 * - Increments error counter
 * ====================================================================
 */
async function migrateShops() {
  console.log('\n📦 Migrating shop images to Cloudinary...\n');
  
  // Fetch all shops from database
  const shops = await client.query("shops:getAllShops", {});
  
  // Initialize counters for progress tracking
  let migrated = 0;  // Successfully migrated
  let skipped = 0;   // Already on Cloudinary or partial failures
  let errors = 0;    // Failed migrations
  
  // Track failed migrations for retry
  const failedMigrations = [];

  // Process each shop individually
  for (const shop of shops) {
    try {
      // SKIP CHECK: Already migrated shops have Cloudinary URLs
      if (shop.shopImageIds && shop.shopImageIds[0]?.startsWith('https://res.cloudinary.com')) {
        console.log(`  ⏭️  Skipping ${shop.name} (already migrated)`);
        skipped++;
        continue;
      }

      const updatedImageUrls = [];
      const originalImageIds = shop.shopImageIds || [];
      
      // Process multiple shop images
      if (originalImageIds.length > 0) {
        for (let i = 0; i < originalImageIds.length; i++) {
          const storageId = originalImageIds[i];
          
          // Step 1: Get download URL from Convex storage
          const imageUrl = await client.query("files:getStorageUrl", { storageId });
          if (!imageUrl) continue; // Skip if URL not found
          
          // Step 2: Download image from Convex
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.error(`⚠️Failed to download image for ${shop.name}: ${response.status}`);
            continue;
          }
          const buffer = await response.buffer();
          
          // Step 3: Upload to Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(
            buffer, 
            'shops', 
            `shop_${shop._id}_${i}.jpg`
          );
          
          // Add to array if upload successful
          if (cloudinaryUrl) {
            updatedImageUrls.push(cloudinaryUrl);
          }
        }
      }

      // SAFETY CHECK: Only update DB if ALL images migrated successfully
      if (updatedImageUrls.length > 0 && updatedImageUrls.length === originalImageIds.length) {
        await client.mutation("shops:updateShop", {
          shopId: shop._id,
          shopImageIds: updatedImageUrls,        // Array of all image URLs
          shopImageId: updatedImageUrls[0],      // Main image (first one)
        });
        console.log(`  ✓ Migrated: ${shop.name} (${updatedImageUrls.length} images)`);
        migrated++;
      } else if (originalImageIds.length > 0) {
        // Partial failure: some images failed to migrate
        const failedIds = originalImageIds.filter((_, index) => !updatedImageUrls[index]);
        failedMigrations.push({
          shopId: shop._id,
          shopName: shop.name,
          totalImages: originalImageIds.length,
          successfulImages: updatedImageUrls.length,
          failedOriginalIds: failedIds
        });
        console.log(`  ⚠️  Partial failure: ${shop.name} (${updatedImageUrls.length}/${originalImageIds.length} images migrated - skipping DB update)`);
        skipped++;
      }
      
    } catch (error) {
      // Log error but continue with next shop
      console.error(`  ❌ Error: ${shop.name} - ${error.message}`);
      errors++;
    }
  }

  // Print summary statistics
  console.log(`\n📊 Shops: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`);
  
  // Write failed migrations to file for retry
  if (failedMigrations.length > 0) {
    const fs = require('fs');
    fs.writeFileSync(
      'failed_shop_migrations.json',
      JSON.stringify(failedMigrations, null, 2)
    );
    console.log(`⚠️  ${failedMigrations.length} shops with partial failures logged to failed_shop_migrations.json\n`);
  }
}

/**
 * ====================================================================
 * FUNCTION: migrateItems
 * ====================================================================
 * 
 * Migrates all item (product) images from Convex to Cloudinary
 * 
 * PROCESS:
 * 1. Fetch all items from database using items:getAllItems query
 * 2. For each item:
 *    - Check if already migrated
 *    - Handle both imageIds[] (new) and imageId (legacy) formats
 *    - Download and upload each image
 *    - Update item record with Cloudinary URLs
 * 3. Track migration statistics
 * 
 * LEGACY SUPPORT:
 * - Handles old items with single imageId field
 * - Converts to imageIds array format for consistency
 * 
 * DATABASE UPDATES:
 * - imageIds: array of Cloudinary URLs
 * - imageId: first URL (for backward compatibility)
 * 
 * NAMING PATTERN:
 * - item_{itemId}_{index}.jpg (multiple images)
 * - item_{itemId}.jpg (single image)
 * ====================================================================
 */
async function migrateItems() {
  console.log('\n📦 Migrating item images to Cloudinary...\n');
  
  const items = await client.query("items:getAllItems", {});
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    try {
      // Skip already migrated items
      if (item.imageIds && item.imageIds[0]?.startsWith('https://res.cloudinary.com')) {
        skipped++;
        continue;
      }

      const updatedImageUrls = [];
      
      // CASE 1: Handle multiple images (imageIds array)
      if (item.imageIds && item.imageIds.length > 0) {
        for (let i = 0; i < item.imageIds.length; i++) {
          const storageId = item.imageIds[i];
          
          // Get Convex storage URL
          const imageUrl = await client.query("files:getStorageUrl", { storageId });
          if (!imageUrl) continue;
          
          // Download from Convex
          const response = await fetch(imageUrl);
          const buffer = await response.buffer();
          
          // Upload to Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(
            buffer, 
            'items', 
            `item_${item._id}_${i}.jpg`
          );
          
          if (cloudinaryUrl) updatedImageUrls.push(cloudinaryUrl);
        }
      } 
      // CASE 2: Handle legacy single image (imageId field)
      else if (item.imageId) {
        const imageUrl = await client.query("files:getStorageUrl", { 
          storageId: item.imageId  // FIX: Use item.imageId, not undefined storageId
        });
        
        if (imageUrl) {
          const response = await fetch(imageUrl);
          const buffer = await response.buffer();
          
          const cloudinaryUrl = await uploadToCloudinary(
            buffer, 
            'items', 
            `item_${item._id}.jpg`
          );
          
          if (cloudinaryUrl) updatedImageUrls.push(cloudinaryUrl);
        }
      }

      // Update database with Cloudinary URLs
      if (updatedImageUrls.length > 0) {
        await client.mutation("items:updateItem", {
          itemId: item._id,
          imageIds: updatedImageUrls,
          imageId: updatedImageUrls[0],
        });
        console.log(`  ✓ Migrated: ${item.name} (${updatedImageUrls.length} images)`);
        migrated++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error: ${item.name} - ${error.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Items: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`);
}

/**
 * ====================================================================
 * FUNCTION: migrateAdvertisements
 * ====================================================================
 * 
 * Migrates all advertisement images AND videos from Convex to Cloudinary
 * 
 * PROCESS:
 * 1. Fetch all advertisements from database
 * 2. For each advertisement:
 *    - Migrate images to Cloudinary image endpoint
 *    - Migrate videos to Cloudinary video endpoint (different API)
 *    - Update advertisement record with both image and video URLs
 * 3. Track migration statistics
 * 
 * SPECIAL HANDLING:
 * - Videos use different Cloudinary endpoint (/video/upload)
 * - Videos require resource_type: 'video' parameter
 * - Both images and videos can exist in same advertisement
 * 
 * DATABASE UPDATES:
 * - imageIds: array of Cloudinary image URLs
 * - videoIds: array of Cloudinary video URLs
 * 
 * NAMING PATTERNS:
 * - ad_{adId}_img_{index}.jpg (for images)
 * - ad_{adId}_vid_{index}.mp4 (for videos)
 * ====================================================================
 */
async function migrateAdvertisements() {
  console.log('\n📦 Migrating advertisement media to Cloudinary...\n');
  
  const ads = await client.query("advertisements:getAllAdvertisements", {});
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const ad of ads) {
    try {
      // Skip if already migrated
      const imagesMigrated = ad.imageIds?.[0]?.startsWith('https://res.cloudinary.com');
      const videosMigrated = ad.videoIds?.[0]?.startsWith('https://res.cloudinary.com');
      const hasNoImages = !ad.imageIds?.length;
      const hasNoVideos = !ad.videoIds?.length;
      
      if ((hasNoImages || imagesMigrated) && (hasNoVideos || videosMigrated)) {
          skipped++;
          continue;
        }

      const updatedImageUrls = [];
      const updatedVideoUrls = [];
      
      // PART 1: Migrate advertisement images
      if (ad.imageIds && ad.imageIds.length > 0) {
        for (let i = 0; i < ad.imageIds.length; i++) {
          const storageId = ad.imageIds[i];
          
          // Get image from Convex storage
          const imageUrl = await client.query("files:getStorageUrl", { storageId });
          if (!imageUrl) continue;
          
          // Download image
          const response = await fetch(imageUrl);
          const buffer = await response.buffer();
          
          // Upload to Cloudinary (images)
          const cloudinaryUrl = await uploadToCloudinary(
            buffer, 
            'advertisements', 
            `ad_${ad._id}_img_${i}.jpg`
          );
          
          if (cloudinaryUrl) updatedImageUrls.push(cloudinaryUrl);
        }
      }

      // PART 2: Migrate advertisement videos
      // Videos require different Cloudinary endpoint and parameters
      if (ad.videoIds && ad.videoIds.length > 0) {
        for (let i = 0; i < ad.videoIds.length; i++) {
          const storageId = ad.videoIds[i];
          
          // FIX: Changed variable name from imageUrl to videoUrl
          const videoUrl = await client.query("files:getStorageUrl", { storageId });
          if (!videoUrl) continue;
          
          // Download video
          const response = await fetch(videoUrl);
          const buffer = await response.buffer();
          
          // Upload to Cloudinary VIDEO endpoint (different from images)
          const formData = new FormData();
          formData.append('file', buffer, { filename: `ad_${ad._id}_vid_${i}.mp4` });
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', `Availo/advertisements`);
          formData.append('resource_type', 'video'); // CRITICAL: Tells Cloudinary it's a video
          
          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
            { method: 'POST', body: formData }
          );
          
          const data = await uploadResponse.json();
          if (!uploadResponse.ok || data.error) {
            console.error(`  ⚠️  Video upload failed for ad ${ad._id}: ${data.error?.message || uploadResponse.statusText}`);
            continue;
          }
          if (data.secure_url) updatedVideoUrls.push(data.secure_url);
        }
      }

      // Update database with both image and video URLs
      if (updatedImageUrls.length > 0 || updatedVideoUrls.length > 0) {
        await client.mutation("advertisements:updateAdvertisement", {
          advertisementId: ad._id,
          imageIds: updatedImageUrls.length > 0 ? updatedImageUrls : undefined,
          videoIds: updatedVideoUrls.length > 0 ? updatedVideoUrls : undefined,
        });
        console.log(`  ✓ Migrated ad ${ad._id} (${updatedImageUrls.length} images, ${updatedVideoUrls.length} videos)`);
        migrated++;
      }
      
    } catch (error) {
      console.error(`  ❌ Error: ${ad._id} - ${error.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Advertisements: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`);
}

/**
 * ====================================================================
 * FUNCTION: migrate (MAIN ENTRY POINT)
 * ====================================================================
 * 
 * Orchestrates the entire migration process
 * 
 * EXECUTION ORDER:
 * 1. Print migration plan and what will happen
 * 2. Migrate shops (usually smallest dataset)
 * 3. Migrate items (usually largest dataset)
 * 4. Migrate advertisements (images + videos)
 * 5. Print completion summary with timing
 * 
 * TIMING:
 * - Tracks total migration duration
 * - Reports in minutes for long-running migrations
 * 
 * ERROR HANDLING:
 * - Wraps entire process in try-catch
 * - Exits with error code 1 on failure
 * - Individual entity errors don't stop entire migration
 * 
 * POST-MIGRATION INSTRUCTIONS:
 * - Prints next steps for user
 * - Reminds to test thoroughly before cleanup
 * ====================================================================
 */
async function migrate() {
  console.log('\n🚀 CLOUDINARY MIGRATION STARTED\n');
  console.log('This will:');
  console.log('  1. Download images from Convex storage');
  console.log('  2. Upload to Cloudinary with optimization');
  console.log('  3. Update database with Cloudinary URLs');
  console.log('  4. Original Convex files remain unchanged (backup)\n');
  
  const startTime = Date.now();

  try {
    // Execute migrations sequentially
    await migrateShops();
    await migrateItems();
    await migrateAdvertisements();
    
    // Calculate and display total duration
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✅ MIGRATION COMPLETE in ${duration} minutes!\n`);
    console.log('Next steps:');
    console.log('  1. Test your app thoroughly');
    console.log('  2. Verify images load correctly');
    console.log('  3. Once confirmed, you can delete old Convex storage files\n');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1); // Exit with error code
  }
}

// ====================================================================
// SCRIPT EXECUTION
// ====================================================================
// Run the migration when script is executed
migrate();

/**
 * ====================================================================
 * HOW TO RUN THIS SCRIPT:
 * ====================================================================
 * 
 * 1. Install dependencies:
 *    npm install convex form-data node-fetch@2
 * 
 * 2. Add getStorageUrl to convex/files.ts:
 *    export const getStorageUrl = query({
 *      args: { storageId: v.id("_storage") },
 *      handler: async (ctx, args) => {
 *        return await ctx.storage.getUrl(args.storageId);
 *      },
 *    });
 * 
 * 3. Run migration:
 *    node migrate-to-cloudinary.js
 * 
 * 4. Monitor console output for progress and errors
 * 
 * 5. After successful migration:
 *    - Test app thoroughly
 *    - Remove getStorageUrl from files.ts
 *    - Delete this script
 * 
 * ====================================================================
 * TROUBLESHOOTING:
 * ====================================================================
 * 
 * Error: "Cannot find module 'convex'"
 * → Run: npm install convex
 * 
 * Error: "Cannot find module 'form-data'"
 * → Run: npm install form-data
 * 
 * Error: "fetch is not defined"
 * → Run: npm install node-fetch@2 (version 2, not 3!)
 * 
 * Error: "Query 'files:getStorageUrl' not found"
 * → Add getStorageUrl function to convex/files.ts (see step 2 above)
 * 
 * Error: "Invalid upload preset"
 * → Check CLOUDINARY_UPLOAD_PRESET matches your Cloudinary account
 * 
 * Error: "Cloud name not found"
 * → Check CLOUDINARY_CLOUD_NAME matches your Cloudinary account
 * 
 * Script runs but no images uploaded:
 * → Check if items already have Cloudinary URLs (already migrated)
 * → Check Convex database actually has data with storage IDs
 * 
 * ====================================================================
 */