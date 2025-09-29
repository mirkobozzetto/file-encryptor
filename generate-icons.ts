import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

const iconSizes: number[] = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath: string = path.join(__dirname, "src/public/icons/icon.svg");
const iconsDir: string = path.join(__dirname, "src/public/icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

interface BackgroundColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

async function generateIcons(): Promise<void> {
  try {
    const svgBuffer: Buffer = fs.readFileSync(svgPath);

    for (const size of iconSizes) {
      const outputPath: string = path.join(
        iconsDir,
        `icon-${size}x${size}.png`
      );

      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    }

    const maskableSize: number = 512;
    const outputPathMaskable: string = path.join(
      iconsDir,
      `icon-maskable-${maskableSize}x${maskableSize}.png`
    );

    const backgroundColor: BackgroundColor = { r: 31, g: 41, b: 55, alpha: 1 };

    await sharp(svgBuffer)
      .resize(Math.floor(maskableSize * 0.8), Math.floor(maskableSize * 0.8))
      .extend({
        top: Math.floor(maskableSize * 0.1),
        bottom: Math.floor(maskableSize * 0.1),
        left: Math.floor(maskableSize * 0.1),
        right: Math.floor(maskableSize * 0.1),
        background: backgroundColor,
      })
      .png()
      .toFile(outputPathMaskable);

    const appleTouchIconPath: string = path.join(
      iconsDir,
      "apple-touch-icon.png"
    );
    await sharp(svgBuffer).resize(180, 180).png().toFile(appleTouchIconPath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Icon generation failed: ${message}`);
  }
}

generateIcons();
