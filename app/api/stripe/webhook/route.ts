import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
     console.error('STRIPE_SECRET_KEY is missing');
     return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Use the secret from environment variables
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });

  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful for session:', session.id);
      // Future: Update database here if you want to reward the user
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}