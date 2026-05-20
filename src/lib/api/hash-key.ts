// hash-key — SHA-256 hash for API key storage and lookup
import { createHash, randomUUID } from "crypto";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(isLive: boolean): {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const prefix = isLive ? "sk_live_" : "sk_test_";
  const fullKey = `${prefix}${randomUUID()}`;
  const keyPrefix = fullKey.slice(0, 12);
  const keyHash = hashApiKey(fullKey);

  return { fullKey, keyPrefix, keyHash };
}
