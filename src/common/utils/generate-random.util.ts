import { randomUUID } from "crypto";

export function generateFreeStripeLikeId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}