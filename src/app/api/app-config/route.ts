import type { NextResponse } from 'next/server';
import { handleGetAppConfig } from './handler';

export async function GET(request: Request): Promise<NextResponse> {
  return handleGetAppConfig(request);
}
