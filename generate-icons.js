const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'src/public/icons/icon.svg');
const iconsDir = path.join(__dirname, 'src/public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate standard icons
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated icon-${size}x${size}.png`);
    }

    // Generate maskable icon (with extra padding for safe zone)
    const maskableSize = 512;
    const outputPathMaskable = path.join(iconsDir, `icon-maskable-${maskableSize}x${maskableSize}.png`);

    // Create a canvas with padding for maskable icon
    await sharp(svgBuffer)
      .resize(Math.floor(maskableSize * 0.8), Math.floor(maskableSize * 0.8))
      .extend({
        top: Math.floor(maskableSize * 0.1),
        bottom: Math.floor(maskableSize * 0.1),
        left: Math.floor(maskableSize * 0.1),
        right: Math.floor(maskableSize * 0.1),
        background: { r: 31, g: 41, b: 55, alpha: 1 } // #1f2937
      })
      .png()
      .toFile(outputPathMaskable);

    console.log(`✅ Generated icon-maskable-${maskableSize}x${maskableSize}.png`);

    // Generate Apple touch icon
    const appleTouchIconPath = path.join(iconsDir, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(appleTouchIconPath);

    console.log(`✅ Generated apple-touch-icon.png`);

    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();