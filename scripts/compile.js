import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const contractsDir = path.join(rootDir, 'contracts');
const artifactsDir = path.join(rootDir, 'artifacts');

if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir);
}

function findFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, files);
        } else if (filePath.endsWith('.sol')) {
            files.push(filePath);
        }
    }
    return files;
}

const contractFiles = findFiles(contractsDir);
const input = {
    language: 'Solidity',
    sources: {},
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        viaIR: true,
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

for (const file of contractFiles) {
    const relativePath = path.relative(rootDir, file);
    input.sources[relativePath] = {
        content: fs.readFileSync(file, 'utf8')
    };
}

function findImports(importPath) {
    let fullPath = path.resolve(rootDir, importPath);
    if (!fs.existsSync(fullPath)) {
        // Try node_modules
        fullPath = path.resolve(rootDir, 'node_modules', importPath);
    }
    
    if (fs.existsSync(fullPath)) {
        return { content: fs.readFileSync(fullPath, 'utf8') };
    }
    return { error: 'File not found' };
}

console.log('Compiling contracts...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
        console.error(error.formattedMessage);
        if (error.severity === 'error') hasError = true;
    }
    if (hasError) process.exit(1);
}

for (const file in output.contracts) {
    for (const contractName in output.contracts[file]) {
        const artifact = {
            abi: output.contracts[file][contractName].abi,
            bytecode: output.contracts[file][contractName].evm.bytecode.object
        };
        const artifactDir = path.join(artifactsDir, path.dirname(file));
        if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
        fs.writeFileSync(
            path.join(artifactDir, `${contractName}.json`),
            JSON.stringify(artifact, null, 2)
        );
        console.log(`Artifact created for ${contractName}`);
    }
}
