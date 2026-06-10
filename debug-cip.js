// Test script to debug CIP file parsing
const fs = require('fs');

// Read Test.cip
const data = fs.readFileSync('/media/windows/Users/takofaru/Data/tugas/semester-4/project/ciproc/Test.cip');
console.log('=== Test.cip Analysis ===');
console.log('File size:', data.length);
console.log('Magic (bytes 0-3):', data.slice(0, 4).toString());

const magicLen = data[3] === 32 ? 4 : 3;
const offset0 = magicLen;
console.log('magicLen:', magicLen);
console.log('offset0:', offset0);

// Check if new format (has method indicator)
const hasMethod = magicLen === 4 && data.length >= offset0 + 22 && data[offset0 + 17] >= 65 && data[offset0 + 17] <= 90;
console.log('hasMethod (checks offset0+17):', hasMethod, 'data[offset0+17]:', data[offset0 + 17]);
console.log('data[offset0+17] is method char?', data[offset0 + 17] >= 65 && data[offset0 + 17] <= 90);

// What the JS decoder sees
const width = data.readUInt16LE(offset0 + 0);
const height = data.readUInt16LE(offset0 + 2);
const k = data[offset0 + 4];
const pByte = data[offset0 + 5];
const totalBits = data.readUInt32LE(offset0 + 6);
const compressedSize = data.readUInt32LE(offset0 + 10);
const method = String.fromCharCode(data[offset0 + 14]);
const frequenciesCount = data.readUInt32LE(offset0 + 15);

console.log('\nDecoded values:');
console.log('  width:', width);
console.log('  height:', height);
console.log('  K:', k);
console.log('  pByte:', pByte);
console.log('  totalBits:', totalBits);
console.log('  compressedSize:', compressedSize);
console.log('  method:', method);
console.log('  frequenciesCount:', frequenciesCount);

// Calculate offsets
const paletteEnd = offset0 + 22 + k * 3;
const freqEnd = paletteEnd + frequenciesCount * 5;
const compressedEnd = freqEnd + compressedSize;

console.log('\nOffset calculations:');
console.log('  Palette starts at:', offset0 + 22);
console.log('  Palette ends at:', paletteEnd, '(size:', k * 3, ')');
console.log('  Frequencies starts at:', paletteEnd);
console.log('  Frequencies ends at:', freqEnd, '(size:', frequenciesCount * 5, ')');
console.log('  Compressed data starts at:', freqEnd);
console.log('  Compressed data ends at:', compressedEnd, '(size:', compressedSize, ')');
console.log('  File size:', data.length);

if (compressedEnd !== data.length) {
  console.log('\nERROR: compressedEnd (', compressedEnd, ') != file size (', data.length, ')');
}

// Show actual bytes at key positions
console.log('\n=== Bytes at key positions ===');
console.log('Bytes 0-3 (magic):', [...data.slice(0, 4)]);
console.log('Bytes 4-7 (width,height):', [...data.slice(4, 8)]);
console.log('Bytes 8-9 (K, p_byte):', [...data.slice(8, 10)]);
console.log('Bytes 10-13 (total_bits):', [...data.slice(10, 14)]);
console.log('Bytes 14-17 (compressed_size):', [...data.slice(14, 18)]);
console.log('Bytes 18 (method):', data[18], '->', String.fromCharCode(data[18]));
console.log('Bytes 19-22 (freq_count):', [...data.slice(19, 23)]);
