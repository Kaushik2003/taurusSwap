export function bigIntToBytes(value: bigint, size = 8): Uint8Array {
  if (value < 0n) {
    throw new Error("Cannot encode negative bigint as unsigned bytes");
  }

  const result = new Uint8Array(size);
  let remaining = value;

  for (let index = size - 1; index >= 0; index -= 1) {
    result[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  if (remaining > 0n) {
    throw new Error(`Value ${value} does not fit in ${size} bytes`);
  }

  return result;
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}
