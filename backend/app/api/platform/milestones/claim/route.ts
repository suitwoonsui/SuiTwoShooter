// Placeholder route: milestone claim is handled via platform API or other route.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Not implemented. Use platform milestone claim API.' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Not implemented. Use platform milestone claim API.' },
    { status: 501 }
  );
}
