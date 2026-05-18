import crypto from 'crypto';
import fs from 'fs';

export const hashPDFFile = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

export const hashesMatch = (hashA, hashB) => hashA === hashB;