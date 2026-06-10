// Test script to debug CIP file parsing
const fs = require('fs');

// Read Test.cip
const data = fs.readFileSync('/home/takofaru/Data/tugas/semester-4/project/ciproc/Test.cip');
console.log('=== Test.cip Analysis ===');
console.log('File size:', data.length);
console.log('Magic (bytes 0-3):', data.slice(0, 4).toString());

const magicLen = data[3] === 32 ? 4 : 3;
const offset0 = magicLen;
console.log('magicLen:', magicLen);
console.log('offset0:', offset0);

// Check if new format (has method indicator)
const hasMethod = magicLen === 4 && data.length >= offset0 + 22 && data[offset0 + 14] >= 65 && data[offset0 + 14] <= 90;
console.log('isNewFormat (checks offset0+14):', hasMethod, 'data[offset0+14]:', data[offset0 + 14]);

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

// Header structure for NEW format (4-byte magic "CIP "):
// offset0 = 4
// Bytes 4-5 (offset0+0): width
// Bytes 6-7 (offset0+2): height
// Byte 8 (offset0+4): K (palette size)
// Byte 9 (offset0+5): p_byte
// Bytes 10-13 (offset0+6 to offset0+9): total_bits
// Bytes 14-17 (offset0+10 to offset0+13): compressed_size
// Byte 18 (offset0+14): method ('F' or 'M')
// Bytes 19-22 (offset0+15 to offset0+18): frequencies_count
// Total header = 4 + 19 = 23 bytes
// Palette starts at: 23 (after header)
// Frequencies start at: 23 + K*3
// Compressed data starts at: 23 + K*3 + frequenciesCount*5

const headerSize = 23; // 4-byte magic + 19-byte header
const paletteStart = headerSize;
const paletteSize = k * 3;
const freqStart = paletteStart + paletteSize;
const freqSize = frequenciesCount * 5;
const compressedStart = freqStart + freqSize;

console.log('\n=== Correct offset calculations ===');
console.log('  Header starts at: 0');
console.log('  Header ends at:', headerSize - 1);
console.log('  Palette starts at:', paletteStart);
console.log('  Palette ends at:', paletteStart + paletteSize - 1, '(size:', paletteSize, ')');
console.log('  Frequencies starts at:', freqStart);
console.log('  Frequencies ends at:', freqStart + freqSize - 1, '(size:', freqSize, ')');
console.log('  Compressed data starts at:', compressedStart);
console.log('  Compressed data ends at:', compressedStart + compressedSize - 1, '(size:', compressedSize, ')');
console.log('  File size:', data.length);

if (compressedStart + compressedSize !== data.length) {
  console.log('\nERROR: compressedEnd (', compressedStart + compressedSize, ') != file size (', data.length, ')');
}
