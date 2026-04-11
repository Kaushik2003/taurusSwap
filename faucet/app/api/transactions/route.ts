import { NextRequest, NextResponse } from 'next/server';
import { getRecentTransactions } from '@/lib/transactions';
import { isValidAddress } from '@/lib/algorand';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transactions
 * 
 * Query parameters:
 *   - address: (optional) Filter transactions for a specific receiver.
 *   - limit: (optional) Number of transactions to return (default 10).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  if (address && !isValidAddress(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid address format.' },
      { status: 400 }
    );
  }

  try {
    const transactions = await getRecentTransactions(address || undefined, limit);
    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('[api/transactions] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction history.' },
      { status: 500 }
    );
  }
}
