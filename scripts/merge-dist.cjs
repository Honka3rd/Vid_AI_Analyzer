const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Merge dist-popup and dist-content into dist
const dist = path.resolve(__dirname, "../dist");
const distPopup = path.resolve(__dirname, "../dist-popup");
const distContent = path.resolve(__dirname, "../dist-content");

fs.rmSync(dist, { recursive: true, force: true });
copyRecursive(distPopup, dist);
copyRecursive(distContent, dist);

console.log("Merged dist-popup and dist-content into dist/");