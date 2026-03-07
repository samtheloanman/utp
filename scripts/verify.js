import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
const voterWallet = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
const otherAccount = new ethers.Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', provider);

function getArtifact(name) {
    const searchPaths = [
        path.join(rootDir, 'artifacts', 'contracts', 'core', `${name}.sol`, `${name}.json`),
        path.join(rootDir, 'artifacts', 'contracts', 'crypto', `${name}.sol`, `${name}.json`),
        path.join(rootDir, 'artifacts', 'contracts', 'plugins', `${name}.sol`, `${name}.json`),
        path.join(rootDir, 'artifacts', 'contracts', 'crypto', `MockVerifiers.sol`, `${name}.json`),
        path.join(rootDir, 'artifacts', 'contracts', name.includes('/') ? name + '.json' : `core/${name}.json`)
    ];
    for (const p of searchPaths) {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    throw new Error(`Artifact for ${name} not found`);
}

async function deploy(name, args = []) {
    const artifact = getArtifact(name);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    console.log(`${name} deployed at: ${await contract.getAddress()}`);
    return contract;
}

async function main() {
    console.log('--- Phase 1: Deployment ---');
    const mockQuantumVerifier = await deploy('MockQuantumVerifier');
    const mockZKVerifier = await deploy('MockZKVerifier');
    const dao = await deploy('DAO');
    
    const governancePlugin = await deploy('GovernancePlugin', [
        await dao.getAddress(),
        await mockQuantumVerifier.getAddress(),
        await mockZKVerifier.getAddress()
    ]);
    
    const treasury = await deploy('Treasury', [await dao.getAddress()]);

    console.log('\n--- Phase 2: Setup ---');
    const EXECUTE_PERMISSION_ID = ethers.keccak256(ethers.toUtf8Bytes("EXECUTE_PERMISSION"));
    
    // Grant GovernancePlugin permission to execute via DAO
    const tx1 = await dao.grant(await dao.getAddress(), await governancePlugin.getAddress(), EXECUTE_PERMISSION_ID);
    await tx1.wait();
    console.log('Execution permission granted to GovernancePlugin');

    // Fund Treasury
    const tx2 = await wallet.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseUnits('1.0', 'ether')
    });
    await tx2.wait();
    console.log('Treasury funded with 1.0 RBTC');

    console.log('\n--- Phase 3: Governance Flow ---');
    const recipient = otherAccount.address;
    const amount = ethers.parseUnits('0.1', 'ether');
    const initialBalance = await provider.getBalance(recipient);

    // Create Proposal
    const treasuryInterface = new ethers.Interface(getArtifact('Treasury').abi);
    const targets = [await treasury.getAddress()];
    const values = [0];
    const callDatas = [
        treasuryInterface.encodeFunctionData('withdraw', [recipient, amount])
    ];

    const tx3 = await governancePlugin.createProposal(targets, values, callDatas);
    await tx3.wait();
    const proposalId = 0;
    console.log(`Proposal ${proposalId} created: Withdraw 0.1 RBTC from Treasury`);

    // Vote Hybrid (ECC + Mock PQ)
    const sender = voterWallet.address;
    const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "address", "address"],
        [proposalId, sender, await governancePlugin.getAddress()]
    );
    const pqSignature = messageHash; // Mock logic
    const pqPublicKey = "0x1234";

    console.log('Casting Hybrid vote...');
    const tx4 = await governancePlugin.connect(voterWallet).castVoteHybrid(proposalId, pqPublicKey, pqSignature);
    await tx4.wait();
    console.log('Hybrid vote cast and proposal executed!');

    // Verify Execution
    const finalBalance = await provider.getBalance(recipient);
    if (finalBalance > initialBalance) {
        console.log('SUCCESS: Recipient received funds!');
    } else {
        console.error('FAILURE: Recipient balance did not increase.');
        process.exit(1);
    }

    console.log('\n--- Phase 4: ZK Vote ---');
    const tx5 = await governancePlugin.createProposal([recipient], [0], ["0x"]);
    await tx5.wait();
    const proposalId2 = 1;

    const zkProof = ethers.hexlify(ethers.toUtf8Bytes("valid_proof"));
    const nullifier = ethers.encodeBytes32String("null_1");

    console.log('Casting ZK vote...');
    const tx6 = await governancePlugin.castVoteZK(proposalId2, zkProof, nullifier);
    await tx6.wait();
    console.log('ZK vote cast and proposal executed!');

    console.log('\n--- ALL VERIFICATIONS PASSED ---');
    process.exit(0);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
