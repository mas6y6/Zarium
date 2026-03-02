const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.resolve(rootDir, 'package');
const seaConfigPath = path.resolve(rootDir, 'sea.json');
const prepBlob = path.resolve(packageDir, 'sea-prep.blob');
const mainJs = path.resolve(packageDir, 'main.js');
const distDir = path.resolve(rootDir, 'dist');
const executableName = process.platform === 'win32' ? 'neutron.exe' : 'neutron';
const executablePath = path.resolve(packageDir, executableName);

function run(command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
}

try {
    if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir);
    }

    console.log('--- Step 1: Building project ---');
    run('npm run build');

    console.log('--- Step 2: Bundling into a single file (CJS) ---');
    // We bundle from dist/index.js (already compiled by tsc) to preserve decorator metadata
    const outFile = path.join(packageDir, 'main.cjs');
    // Ensure we include all server files in the bundle by using the compiled dist/index.js as entry point
    // We use --loader to embed assets directly in the bundle
    run(`npx esbuild "${path.join(distDir, 'index.js')}" --bundle --platform=node --format=cjs --outfile="${outFile}" --external:sqlite3 --external:pg --external:mysql2 --external:ejs --keep-names --loader:.html=text --loader:.css=text --loader:.yml=text --loader:.ts=text`);

    // console.log('--- Step 2.1: Copying assets to package folder ---');
    // Inlined assets mean we don't need to copy them to the package folder for the EXE to work,
    // though the user might still want them there for customization.
    // For "TRULY one exe" we can skip this or keep it as optional.
    // Let's skip it to demonstrate the "bundled to one exe" part.

    console.log('--- Step 2.1: Creating bootstrap entry point ---');
    // To avoid the SEA require() warning and allow loading native modules from disk,
    // we use a CJS bootstrap that uses Module.createRequire.
    const entryPath = path.join(packageDir, 'entry.cjs');
    const entryContent = `const { createRequire } = require('node:module');
const requireNext = createRequire(process.execPath);
requireNext('./main.cjs');
`;
    fs.writeFileSync(entryPath, entryContent);

    console.log('--- Step 2.2: Copying native modules (sqlite3) ---');
    // Native modules cannot be bundled into the SEA blob effectively.
    // We'll copy them to the package folder so they're available on disk.
    const nodeModulesDest = path.join(packageDir, 'node_modules');
    if (!fs.existsSync(nodeModulesDest)) {
        fs.mkdirSync(nodeModulesDest, { recursive: true });
    }
    
    // Helper to copy a package from project's node_modules to package/node_modules
    function copyModule(moduleName) {
        const src = path.join(rootDir, 'node_modules', moduleName);
        const dest = path.join(nodeModulesDest, moduleName);
        if (fs.existsSync(src)) {
            console.log(`Copying ${moduleName} to ${dest}`);
            // Use xcopy or similar on Windows, cp -r on others
            if (process.platform === 'win32') {
                execSync(`xcopy "${src}" "${dest}" /E /I /H /Y /Q`, { stdio: 'ignore' });
            } else {
                execSync(`cp -r "${src}" "${dest}"`, { stdio: 'ignore' });
            }
        }
    }
    
    copyModule('sqlite3');
    // Also copy other potential native drivers if they exist
    copyModule('pg');
    copyModule('mysql2');

    console.log('--- Step 3: Generating SEA blob ---');
    run(`node --experimental-sea-config "${seaConfigPath}"`);

    console.log('--- Step 4: Preparing executable ---');
    const nodeExe = process.execPath;
    console.log(`Copying ${nodeExe} to ${executablePath}`);
    fs.copyFileSync(nodeExe, executablePath);

    console.log('--- Step 5: Injecting blob into executable ---');
    const postjectFlags = process.platform === 'darwin'
        ? '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name __NODE_SEA'
        : '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

    run(`npx postject "${executablePath}" NODE_SEA_BLOB "${prepBlob}" ${postjectFlags} --overwrite`);

    console.log('\n--- SUCCESS ---');
    console.log(`Executable created at: ${executablePath}`);

} catch (error) {
    console.error('\n--- FAILED ---');
    console.error(error.message);
    process.exit(1);
}
