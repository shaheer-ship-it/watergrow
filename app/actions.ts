'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

export async function createCheckoutSession() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    throw new Error("Payment configuration missing. Please check server logs.");
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });

  const headersList = await headers();
  const origin = headersList.get('origin') || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Hydration Fund Donation',
            description: 'Support the Water & Grow app',
            images: ['https://images.unsplash.com/photo-1546552356-3fae876a61ca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'],
          },
          unit_amount: 500, // $5.00
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${origin}/?success=true`,
    cancel_url: `${origin}/?canceled=true`,
  });

  return { sessionId: session.id };
}