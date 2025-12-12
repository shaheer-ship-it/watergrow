import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Error: STRIPE_SECRET_KEY is missing in environment variables.');
      return res.status(500).json({
        error: 'Configuration Error: STRIPE_SECRET_KEY is missing. Please check Vercel settings and Redeploy.'
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Get origin from request headers or use fallback
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://watergrow.vercel.app';

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

    return res.status(200).json({ sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe Session Creation Failed:', err);
    return res.status(500).json({ error: `Payment Error: ${err.message}` });
  }
}
