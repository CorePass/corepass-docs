const fs = require('fs');
const path = require('path');

const docsDirectory = 'versioned_docs';
const outputDirectory = 'versioned_sidebars';

// Function to generate sidebar for a given version
function generateSidebarForVersion(versionDir) {
    const sidebar = {};
    const versionDocsPath = path.join(docsDirectory, versionDir);

    fs.readdirSync(versionDocsPath, { withFileTypes: true }).forEach(dirent => {
        if (dirent.isDirectory()) {
            const category = dirent.name;
            const categoryPath = path.join(versionDocsPath, category);
            const docs = fs.readdirSync(categoryPath)
                .filter(file => file.endsWith('.md') || file.endsWith('.mdx'))
                .map(file => path.join(category, file.replace(/\.mdx?$/, '')));

            if (docs.length > 0) {
                sidebar[category] = docs.map(item=>item.replace(/\\/g, '/'));
            }
        }
    });

    const outputPath = path.join(outputDirectory, `${versionDir}-sidebars.json`);
    fs.writeFileSync(outputPath, JSON.stringify(sidebar, null, 2));
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDirectory)){
    fs.mkdirSync(outputDirectory);
}

// Generate sidebar for each version
fs.readdirSync(docsDirectory).forEach(versionDir => {
    if (fs.statSync(path.join(docsDirectory, versionDir)).isDirectory()) {
        console.log(`Generating sidebar for ${versionDir}...`);
        generateSidebarForVersion(versionDir);
    }
});

console.log('Sidebar generation complete.');
