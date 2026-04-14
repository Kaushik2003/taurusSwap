import algosdk from "algosdk";
import { OrbitalConfig } from "../types";

export function createAlgodClient(config: OrbitalConfig): algosdk.Algodv2 {
  return new algosdk.Algodv2(
    config.algodToken,
    config.algodUrl,
    config.algodPort,
  );
}
