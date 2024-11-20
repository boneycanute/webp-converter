import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import gif2webp from "gif2webp-bin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directories
const TO_BE_CONVERTED_DIR = "to-be-converted";
const CONVERTED_DIR = "converted";

// Supported formats and their extensions
const SUPPORTED_FORMATS = new Set([
  ".gif",
  ".png",
  ".jpg",
  ".jpeg",
  ".tiff",
  ".bmp",
  ".webp",
  ".avif",
]);

// Function to check if file is an animated GIF
async function isAnimatedGif(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.pages && metadata.pages > 1;
  } catch (error) {
    // If Sharp can't read it properly, assume it's animated
    return true;
  }
}

// Function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Function to convert animated GIF using gif2webp
async function convertAnimatedGif(inputPath, outputPath) {
  await new Promise((resolve, reject) => {
    execFile(
      gif2webp,
      [
        inputPath,
        "-q",
        "75", // Quality (balanced)
        "-m",
        "6", // Maximum compression
        "-min_size", // Minimize size
        "-mt", // Multi-threading
        "-o",
        outputPath,
      ],
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

// Function to convert static images using Sharp
async function convertWithSharp(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  let sharpInstance = sharp(inputPath);

  // Format-specific optimizations
  if (ext === ".png") {
    sharpInstance = sharpInstance.webp({
      quality: 75,
      lossless: false,
      nearLossless: true,
      effort: 6,
      smartSubsample: true,
    });
  } else if (ext === ".jpg" || ext === ".jpeg") {
    sharpInstance = sharpInstance.webp({
      quality: 80,
      effort: 6,
      smartSubsample: true,
    });
  } else {
    // Default settings for other formats
    sharpInstance = sharpInstance.webp({
      quality: 75,
      effort: 6,
    });
  }

  await sharpInstance.toFile(outputPath);
}

// Function to convert a single file
async function convertFile(inputPath, outputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    if (!SUPPORTED_FORMATS.has(ext)) {
      console.log(`Skipping unsupported file: ${path.basename(inputPath)}`);
      return null;
    }

    // Get original file size
    const originalSize = (await fs.stat(inputPath)).size;

    // Ensure output directory exists
    await ensureDir(path.dirname(outputPath));

    // Convert based on file type
    if (ext === ".gif" && (await isAnimatedGif(inputPath))) {
      await convertAnimatedGif(inputPath, outputPath);
    } else {
      await convertWithSharp(inputPath, outputPath);
    }

    // Get new file size and calculate savings
    const newSize = (await fs.stat(outputPath)).size;
    const savings = (((originalSize - newSize) / originalSize) * 100).toFixed(
      2
    );

    console.log(`✓ Converted: ${path.basename(inputPath)}`);
    console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  New size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Reduced by: ${savings}%\n`);

    return {
      success: true,
      originalSize,
      newSize,
    };
  } catch (error) {
    console.error(
      `✗ Error converting ${path.basename(inputPath)}:`,
      error.message
    );
    return null;
  }
}

// Function to recursively process directories
async function processDirectory(inputDir, outputDir) {
  let stats = {
    totalFiles: 0,
    successfulConversions: 0,
    failedConversions: 0,
    totalOriginalSize: 0,
    totalNewSize: 0,
    formats: {},
  };

  try {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });

    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      const relativePath = path.relative(TO_BE_CONVERTED_DIR, inputPath);
      const outputPath = path.join(outputDir, relativePath);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        const subStats = await processDirectory(inputPath, outputDir);
        // Merge stats
        stats.totalFiles += subStats.totalFiles;
        stats.successfulConversions += subStats.successfulConversions;
        stats.failedConversions += subStats.failedConversions;
        stats.totalOriginalSize += subStats.totalOriginalSize;
        stats.totalNewSize += subStats.totalNewSize;
        // Merge format stats
        Object.entries(subStats.formats).forEach(([format, count]) => {
          stats.formats[format] = (stats.formats[format] || 0) + count;
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_FORMATS.has(ext)) {
          stats.totalFiles++;
          stats.formats[ext] = (stats.formats[ext] || 0) + 1;

          const outputWebP = outputPath.replace(/\.[^/.]+$/, ".webp");
          const result = await convertFile(inputPath, outputWebP);

          if (result) {
            stats.successfulConversions++;
            stats.totalOriginalSize += result.originalSize;
            stats.totalNewSize += result.newSize;
          } else {
            stats.failedConversions++;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${inputDir}:`, error.message);
  }

  return stats;
}

// Main function
async function main() {
  try {
    // Ensure base directories exist
    await ensureDir(TO_BE_CONVERTED_DIR);
    await ensureDir(CONVERTED_DIR);

    console.log("Starting conversion process...\n");

    // Process the to-be-converted directory
    const stats = await processDirectory(TO_BE_CONVERTED_DIR, CONVERTED_DIR);

    // Print summary
    console.log("\nConversion Summary:");
    console.log(`Total files processed: ${stats.totalFiles}`);
    console.log(`Successful conversions: ${stats.successfulConversions}`);
    console.log(`Failed conversions: ${stats.failedConversions}`);
    console.log(
      `\nTotal original size: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(
      `Total new size: ${(stats.totalNewSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `Overall reduction: ${(
        ((stats.totalOriginalSize - stats.totalNewSize) /
          stats.totalOriginalSize) *
        100
      ).toFixed(2)}%`
    );

    console.log("\nFiles processed by format:");
    Object.entries(stats.formats).forEach(([format, count]) => {
      console.log(`${format}: ${count} files`);
    });

    console.log('\nConverted files are in the "converted" directory');
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the converter
main().catch(console.error);
