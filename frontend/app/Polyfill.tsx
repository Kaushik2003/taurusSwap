"use client";
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}
export default function Polyfill() {
  return null;
}
