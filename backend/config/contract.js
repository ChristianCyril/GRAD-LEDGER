import { ethers } from 'ethers';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { abi } = require('./contractABI.json');

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet   = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

export default contract;