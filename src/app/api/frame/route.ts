import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trustedData: { messageBytes } } = body;

    const {
      valid,
      action
    } = await neynarClient.validateFrameAction(messageBytes);


    if (!valid) {
      return NextResponse.json({ error: 'Invalid frame' }, { status: 400 });
    }

    // TODO: Do something with the action data

    const frameHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://placehold.co/600x400?text=Hello+World" />
          <meta property="fc:frame:button:1" content="Click me" />
        </head>
        <body>
          <h1>Hello, World!</h1>
        </body>
      </html>
    `;

    return new NextResponse(frameHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (err) {
    console.error('Frame error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
