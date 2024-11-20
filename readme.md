## Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (version 14 or higher).

## Installation

1. Clone this repository:

```bash
git clone https://github.com/your-username/bulk-image-converter.git
cd bulk-image-converter
```

2. Install dependencies:

```bash
npm install
```

## Project Structure

The script expects/creates the following directory structure:

```
project/
├── convert-images.js
├── package.json
├── to-be-converted/    # Place your images here
│   └── your-folder/    # Your folder structure
│       ├── subfolder1/
│       │   ├── image1.gif
│       │   └── image2.png
│       └── subfolder2/
│           └── image3.jpg
└── converted/          # Output directory
    └── your-folder/    # Mirrored structure
        ├── subfolder1/
        │   ├── image1.webp
        │   └── image2.webp
        └── subfolder2/
            └── image3.webp
```

## Usage

1. Create the required folders:

   - The script will automatically create `to-be-converted` and `converted` folders if they don't exist

2. Place your images:

   - Put the folders containing your images inside the `to-be-converted` directory
   - The script will process all supported images in all subdirectories

3. Run the script:

```bash
node convert-images.js
```

4. Find your converted images:
   - Converted WebP images will be in the `converted` directory
   - The folder structure will match your original structure

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are installed:

```bash
npm install sharp gif2webp-bin
```

2. Check Node.js version:

```bash
node --version  # Should be 14 or higher
```

3. Verify file permissions:

   - Make sure the script has read access to source files
   - Make sure the script has write access to the output directory

4. For animated GIF issues:
   - Ensure gif2webp-bin is properly installed
   - Try reinstalling dependencies
