import { useMemo } from 'react';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '@/utils/network/getAlgoClientConfigs';

export function useAlgodClient(): algosdk.Algodv2 {
  return useMemo(() => {
    const cfg = getAlgodConfigFromViteEnvironment();
    return new algosdk.Algodv2(cfg.token ?? '', cfg.server, cfg.port);
  }, []);
}

export function useIndexerClient(): algosdk.Indexer {
  return useMemo(() => {
    const cfg = getIndexerConfigFromViteEnvironment();
    return new algosdk.Indexer(cfg.token ?? '', cfg.server, cfg.port);
  }, []);
}

export const POOL_APP_ID = Number(process.env.NEXT_PUBLIC_POOL_APP_ID ?? 758284478);
