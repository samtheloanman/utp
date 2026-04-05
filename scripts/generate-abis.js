import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'artifacts', 'contracts');
const outputDir = path.join(rootDir, 'src', 'lib');
const outputFile = path.join(outputDir, 'contracts.ts');

const contractNames = [
    'DAO',
    'Treasury',
    'UTPToken',
    'UBTC',
    'GovernancePlugin',
    'EventMarket',
    'StablecoinController'
];

function findArtifact(contractName) {
    const files = fs.readdirSync(artifactsDir, { recursive: true });
    const artifactFile = files.find(file => file.endsWith(`${contractName}.json`));
    if (!artifactFile) {
        throw new Error(`Artifact not found for ${contractName}`);
    }
    const fullPath = path.join(artifactsDir, artifactFile);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

let outputContent = `// Auto-generated from Hardhat artifacts — do not edit manually\n\n`;

for (const name of contractNames) {
    const artifact = findArtifact(name);
    outputContent += `export const ${name}ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;\n\n`;
}

// Add addresses
const deploymentsDir = path.join(rootDir, 'deployments');
const addressFiles = fs.readdirSync(deploymentsDir).filter(f => f.endsWith('.json'));

const addresses = {};
for (const file of addressFiles) {
    const network = file.replace('.json', '');
    addresses[network] = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), 'utf8'));
}

outputContent += `export const ADDRESSES = ${JSON.stringify(addresses, null, 2)} as const;\n`;

fs.writeFileSync(outputFile, outputContent);

console.log(`✅ ABIs and addresses written to ${outputFile}`);
