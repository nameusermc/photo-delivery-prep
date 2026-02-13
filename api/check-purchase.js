export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const headers = {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Look up customer by email
    const customerResponse = await fetch(
      `https://api.paddle.com/customers?email=${encodeURIComponent(email)}`,
      { headers }
    );

    if (!customerResponse.ok) {
      throw new Error('Failed to fetch customer');
    }

    const customerData = await customerResponse.json();

    if (!customerData.data || customerData.data.length === 0) {
      return res.status(200).json({ unlocked: false });
    }

    const customerId = customerData.data[0].id;

    // Step 2: Get completed transactions for this customer
    const transactionsResponse = await fetch(
      `https://api.paddle.com/transactions?customer_id=${customerId}&status=completed`,
      { headers }
    );

    if (!transactionsResponse.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const transactionsData = await transactionsResponse.json();

    // Check if any transaction contains the production product
    const hasPurchased = transactionsData.data?.some(transaction =>
      transaction.items?.some(item =>
        item.price.id === 'pri_01kg5n2jrb4xwpgehfhrpqjm0y'
      )
    );

    return res.status(200).json({ unlocked: hasPurchased });

  } catch (error) {
    console.error('Error checking purchase:', error);
    return res.status(500).json({ error: 'Failed to check purchase' });
  }
}
