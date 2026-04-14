const EXPLORER_BASE_URL = 'https://testnet.explorer.perawallet.app';

export type ExplorerLinkType = 'asset' | 'transaction' | 'application' | 'address';

/**
 * Generates a Pera Explorer URL for the given resource type and ID.
 */
export function getExplorerUrl(id: string | number, type: ExplorerLinkType): string {
  const path = {
    asset: 'asset',
    transaction: 'tx',
    application: 'application',
    address: 'address',
  }[type];

  return `${EXPLORER_BASE_URL}/${path}/${id}`;
}

/**
 * Shortens a transaction hash or address for display.
 * e.g. "ABC...XYZ"
 */
export function shortenId(id: string, start = 4, end = 4): string {
  if (id.length <= start + end) return id;
  return `${id.slice(0, start)}...${id.slice(-end)}`;
}
