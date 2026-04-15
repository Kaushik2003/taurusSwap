import { AlgoViteClientConfig, AlgoViteKMDConfig } from '../../interfaces/network'

export function getAlgodConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!process.env.NEXT_PUBLIC_ALGOD_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying NEXT_PUBLIC_ALGOD_SERVER in the environment variables')
  }

  return {
    server: process.env.NEXT_PUBLIC_ALGOD_SERVER!,
    port: process.env.NEXT_PUBLIC_ALGOD_PORT ?? '',
    token: process.env.NEXT_PUBLIC_ALGOD_TOKEN ?? '',
    network: process.env.NEXT_PUBLIC_ALGOD_NETWORK ?? '',
  }
}

export function getIndexerConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!process.env.NEXT_PUBLIC_INDEXER_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying NEXT_PUBLIC_INDEXER_SERVER in the environment variables')
  }

  return {
    server: process.env.NEXT_PUBLIC_INDEXER_SERVER!,
    port: process.env.NEXT_PUBLIC_INDEXER_PORT ?? '',
    token: process.env.NEXT_PUBLIC_INDEXER_TOKEN ?? '',
    network: process.env.NEXT_PUBLIC_ALGOD_NETWORK ?? '',
  }
}

export function getKmdConfigFromViteEnvironment(): AlgoViteKMDConfig {
  if (!process.env.NEXT_PUBLIC_KMD_SERVER) {
    throw new Error('Attempt to get default kmd configuration without specifying NEXT_PUBLIC_KMD_SERVER in the environment variables')
  }

  return {
    server: process.env.NEXT_PUBLIC_KMD_SERVER!,
    port: process.env.NEXT_PUBLIC_KMD_PORT ?? '',
    token: process.env.NEXT_PUBLIC_KMD_TOKEN ?? '',
    wallet: process.env.NEXT_PUBLIC_KMD_WALLET ?? '',
    password: process.env.NEXT_PUBLIC_KMD_PASSWORD ?? '',
  }
}
