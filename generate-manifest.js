const fs = require('fs');
const path = require('path');

const FEED_DIR = path.join(__dirname, 'feed');
const MANIFEST_PATH = path.join(FEED_DIR, 'manifest.json');

// Files to explicitly exclude (system files, docs, etc.)
const EXCLUDED_FILES = [
  'Readme.md',
  'LUT_IMPLEMENTATION_STATUS.md',
  'StoreKitSetupGuide.md',
  'SubscriptionIntegrationGuide.md',
  'VideoOptimizationGuide.md',
  'sample.md',
  'chat.md'
];

function generateManifest() {
  console.log('🔍 Scanning feed directory...');

  try {
    const files = fs.readdirSync(FEED_DIR);

    const contentFiles = files.filter(file => {
      // 1. Must be a markdown file
      if (path.extname(file) !== '.md') return false;

      // 2. Must not be in excluded list
      if (EXCLUDED_FILES.includes(file)) return false;

      // 3. Must have valid Frontmatter with a 'category'
      const filePath = path.join(FEED_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for Frontmatter block (--- ... ---) and "category:" field
      const hasFrontmatter = /^-{3}[\s\S]+?-{3}/.test(content);
      const hasCategory = /category:\s*["']?(.+?)["']?/.test(content);

      if (hasFrontmatter && hasCategory) {
        return true;
      } else {
        console.log(`   ⚠️  Skipping ${file}: No valid category found in frontmatter.`);
        return false;
      }
    });

    // Format the list as relative paths expected by the frontend
    const manifestList = contentFiles.map(file => `feed/${file}`);

    const manifestData = {
      generatedAt: new Date().toISOString(),
      files: manifestList
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestData, null, 2));
    
    console.log('✅ Manifest generated successfully!');
    console.log(`   📁 Included ${manifestList.length} files:`);
    manifestList.forEach(f => console.log(`      - ${f}`));

  } catch (error) {
    console.error('❌ Error generating manifest:', error);
  }
}

generateManifest();
