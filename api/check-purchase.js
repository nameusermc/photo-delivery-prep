export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Call Paddle API to check for transactions
    const response = await fetch('https://sandbox-api.paddle.com/transactions', {
      headers: {
        'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Paddle API error');
    }

    const data = await response.json();
    
    // Check if this email has a completed purchase for your product
    const hasPurchased = data.data?.some(transaction => 
      transaction.customer_email === email &&
      transaction.status === 'completed' &&
      transaction.items?.some(item => item.price_id === 'pri_01kfc8wsrhhqezk6htxdy7eppe')
    );

    return res.status(200).json({ unlocked: hasPurchased });

  } catch (error) {
    console.error('Error checking purchase:', error);
    return res.status(500).json({ error: 'Failed to check purchase' });
  }
}
