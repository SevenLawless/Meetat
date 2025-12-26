const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Helper function to calculate available dotation
const getAvailableDotation = (dotation, realBalance) => {
  return parseFloat(dotation) - parseFloat(realBalance);
};

// Helper function to get card summary
const getCardSummary = (card) => {
  const availableDotation = getAvailableDotation(card.dotation, card.real_balance);
  const totalBalance = parseFloat(card.cold_balance) + parseFloat(card.real_balance);
  return {
    ...card,
    available_dotation: availableDotation,
    total_balance: totalBalance
  };
};

// Get all cards with summaries
router.get('/cards', authenticate, async (req, res, next) => {
  try {
    const [cards] = await db.query(
      'SELECT * FROM credit_cards ORDER BY name ASC'
    );

    const cardsWithSummary = cards.map(getCardSummary);

    res.json({ cards: cardsWithSummary });
  } catch (error) {
    next(error);
  }
});

// Get single card with transactions
router.get('/cards/:id', authenticate, async (req, res, next) => {
  try {
    const cardId = req.params.id;

    const [cards] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [cardId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    // Get transactions
    const [transactions] = await db.query(
      `SELECT t.*, 
        a.name as ad_account_name,
        sc.name as source_card_name
       FROM card_transactions t
       LEFT JOIN ad_accounts a ON t.ad_account_id = a.id
       LEFT JOIN credit_cards sc ON t.source_card_id = sc.id
       WHERE t.card_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [cardId]
    );

    const cardWithSummary = getCardSummary(card);

    res.json({ card: { ...cardWithSummary, transactions } });
  } catch (error) {
    next(error);
  }
});

// Create card
router.post('/cards', authenticate, auditLog('credit_card'), async (req, res, next) => {
  try {
    const { name, last_four_digits, dotation } = req.body;

    if (!name || !last_four_digits || dotation === undefined) {
      return res.status(400).json({ error: 'Name, last four digits, and dotation are required' });
    }

    if (dotation <= 0) {
      return res.status(400).json({ error: 'Dotation must be positive' });
    }

    if (!/^\d{4}$/.test(last_four_digits)) {
      return res.status(400).json({ error: 'Last four digits must be exactly 4 digits' });
    }

    // Check for unique name
    const [existing] = await db.query(
      'SELECT id FROM credit_cards WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Card name must be unique' });
    }

    const [result] = await db.query(
      `INSERT INTO credit_cards (name, last_four_digits, dotation, cold_balance, real_balance, created_at)
       VALUES (?, ?, ?, 0, 0, NOW())`,
      [name, last_four_digits, dotation]
    );

    const [newCard] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ card: getCardSummary(newCard[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Card name must be unique' });
    }
    next(error);
  }
});

// Update card
router.put('/cards/:id', authenticate, auditLog('credit_card'), async (req, res, next) => {
  try {
    const cardId = req.params.id;
    const { name, last_four_digits, dotation } = req.body;

    const [cards] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [cardId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    // Validate dotation if provided
    if (dotation !== undefined && dotation <= 0) {
      return res.status(400).json({ error: 'Dotation must be positive' });
    }

    // Validate last four digits if provided
    if (last_four_digits && !/^\d{4}$/.test(last_four_digits)) {
      return res.status(400).json({ error: 'Last four digits must be exactly 4 digits' });
    }

    // Check for unique name if changed
    if (name && name !== card.name) {
      const [existing] = await db.query(
        'SELECT id FROM credit_cards WHERE name = ? AND id != ?',
        [name, cardId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Card name must be unique' });
      }
    }

    await db.query(
      `UPDATE credit_cards 
       SET name = COALESCE(?, name),
           last_four_digits = COALESCE(?, last_four_digits),
           dotation = COALESCE(?, dotation),
           updated_at = NOW()
       WHERE id = ?`,
      [name || null, last_four_digits || null, dotation || null, cardId]
    );

    const [updatedCard] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [cardId]
    );

    res.json({ card: getCardSummary(updatedCard[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Card name must be unique' });
    }
    next(error);
  }
});

// Delete card
router.delete('/cards/:id', authenticate, auditLog('credit_card'), async (req, res, next) => {
  try {
    const cardId = req.params.id;

    const [cards] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [cardId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Transactions will be cascade deleted
    await db.query('DELETE FROM credit_cards WHERE id = ?', [cardId]);

    res.json({ message: 'Card deleted' });
  } catch (error) {
    next(error);
  }
});

// Get transactions for a card
router.get('/cards/:id/transactions', authenticate, async (req, res, next) => {
  try {
    const cardId = req.params.id;

    const [cards] = await db.query(
      'SELECT id FROM credit_cards WHERE id = ?',
      [cardId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const [transactions] = await db.query(
      `SELECT t.*, 
        a.name as ad_account_name,
        sc.name as source_card_name
       FROM card_transactions t
       LEFT JOIN ad_accounts a ON t.ad_account_id = a.id
       LEFT JOIN credit_cards sc ON t.source_card_id = sc.id
       WHERE t.card_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [cardId]
    );

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

// Create transaction (with dotation logic)
router.post('/cards/:id/transactions', authenticate, auditLog('card_transaction'), async (req, res, next) => {
  try {
    const cardId = req.params.id;
    const { type, subtype, amount, ad_account_id, source_card_id, description, transaction_date } = req.body;

    if (!type || !subtype || !amount || !transaction_date) {
      return res.status(400).json({ error: 'Type, subtype, amount, and transaction_date are required' });
    }

    if (!['revenue', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be revenue or expense' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Get card
    const [cards] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [cardId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let newColdBalance = parseFloat(card.cold_balance);
      let newRealBalance = parseFloat(card.real_balance);

      // Handle revenue transactions
      if (type === 'revenue') {
        if (subtype === 'cold_to_real') {
          // Move from cold to real balance
          if (newColdBalance < amount) {
            throw new Error('Insufficient cold balance');
          }
          newColdBalance -= amount;
          newRealBalance += amount;
        } else if (subtype === 'card_to_card') {
          // Transfer from another card's cold balance
          if (!source_card_id) {
            throw new Error('Source card ID is required for card-to-card transfers');
          }

          const [sourceCards] = await connection.query(
            'SELECT * FROM credit_cards WHERE id = ?',
            [source_card_id]
          );

          if (sourceCards.length === 0) {
            throw new Error('Source card not found');
          }

          const sourceCard = sourceCards[0];
          const sourceColdBalance = parseFloat(sourceCard.cold_balance);

          if (sourceColdBalance < amount) {
            throw new Error('Insufficient cold balance in source card');
          }

          // Update source card (decrease cold balance)
          await connection.query(
            'UPDATE credit_cards SET cold_balance = cold_balance - ?, updated_at = NOW() WHERE id = ?',
            [amount, source_card_id]
          );

          // Update destination card (increase cold balance, no dotation impact)
          newColdBalance += amount;
        } else {
          throw new Error('Invalid revenue subtype');
        }
      }
      // Handle expense transactions
      else if (type === 'expense') {
        if (subtype === 'ad_account_spend') {
          // Spend from real balance on ad account
          if (!ad_account_id) {
            throw new Error('Ad account ID is required for ad account spend');
          }

          const [adAccounts] = await connection.query(
            'SELECT id FROM ad_accounts WHERE id = ?',
            [ad_account_id]
          );

          if (adAccounts.length === 0) {
            throw new Error('Ad account not found');
          }

          if (newRealBalance < amount) {
            throw new Error('Insufficient real balance');
          }

          newRealBalance -= amount;
        } else if (subtype === 'real_to_cold') {
          // Move from real to cold balance
          if (newRealBalance < amount) {
            throw new Error('Insufficient real balance');
          }
          newRealBalance -= amount;
          newColdBalance += amount;
        } else {
          throw new Error('Invalid expense subtype');
        }
      }

      // Update card balances
      await connection.query(
        'UPDATE credit_cards SET cold_balance = ?, real_balance = ?, updated_at = NOW() WHERE id = ?',
        [newColdBalance, newRealBalance, cardId]
      );

      // Insert transaction
      const [result] = await connection.query(
        `INSERT INTO card_transactions 
         (card_id, type, subtype, amount, ad_account_id, source_card_id, description, transaction_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [cardId, type, subtype, amount, ad_account_id || null, source_card_id || null, description || null, transaction_date]
      );

      await connection.commit();

      // Get created transaction with joins
      const [transactions] = await db.query(
        `SELECT t.*, 
          a.name as ad_account_name,
          sc.name as source_card_name
         FROM card_transactions t
         LEFT JOIN ad_accounts a ON t.ad_account_id = a.id
         LEFT JOIN credit_cards sc ON t.source_card_id = sc.id
         WHERE t.id = ?`,
        [result.insertId]
      );

      res.status(201).json({ transaction: transactions[0] });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/transactions/:id', authenticate, auditLog('card_transaction'), async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { description, transaction_date } = req.body;

    const [transactions] = await db.query(
      'SELECT * FROM card_transactions WHERE id = ?',
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only allow updating description and date
    // Amount and type changes would require balance recalculation, which is complex
    await db.query(
      `UPDATE card_transactions 
       SET description = COALESCE(?, description),
           transaction_date = COALESCE(?, transaction_date),
           updated_at = NOW()
       WHERE id = ?`,
      [description || null, transaction_date || null, transactionId]
    );

    const [updatedTransactions] = await db.query(
      `SELECT t.*, 
        a.name as ad_account_name,
        sc.name as source_card_name
       FROM card_transactions t
       LEFT JOIN ad_accounts a ON t.ad_account_id = a.id
       LEFT JOIN credit_cards sc ON t.source_card_id = sc.id
       WHERE t.id = ?`,
      [transactionId]
    );

    res.json({ transaction: updatedTransactions[0] });
  } catch (error) {
    next(error);
  }
});

// Delete transaction (revert balances)
router.delete('/transactions/:id', authenticate, auditLog('card_transaction'), async (req, res, next) => {
  try {
    const transactionId = req.params.id;

    const [transactions] = await db.query(
      'SELECT * FROM card_transactions WHERE id = ?',
      [transactionId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    // Get card
    const [cards] = await db.query(
      'SELECT * FROM credit_cards WHERE id = ?',
      [transaction.card_id]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let newColdBalance = parseFloat(card.cold_balance);
      let newRealBalance = parseFloat(card.real_balance);
      const amount = parseFloat(transaction.amount);

      // Reverse the transaction logic
      if (transaction.type === 'revenue') {
        if (transaction.subtype === 'cold_to_real') {
          // Reverse: move from real back to cold
          newRealBalance -= amount;
          newColdBalance += amount;
        } else if (transaction.subtype === 'card_to_card') {
          // Reverse: move from this card's cold back to source card's cold
          if (transaction.source_card_id) {
            const [sourceCards] = await connection.query(
              'SELECT * FROM credit_cards WHERE id = ?',
              [transaction.source_card_id]
            );

            if (sourceCards.length > 0) {
              await connection.query(
                'UPDATE credit_cards SET cold_balance = cold_balance + ?, updated_at = NOW() WHERE id = ?',
                [amount, transaction.source_card_id]
              );
            }
          }
          newColdBalance -= amount;
        }
      } else if (transaction.type === 'expense') {
        if (transaction.subtype === 'ad_account_spend') {
          // Reverse: add back to real balance
          newRealBalance += amount;
        } else if (transaction.subtype === 'real_to_cold') {
          // Reverse: move from cold back to real
          newColdBalance -= amount;
          newRealBalance += amount;
        }
      }

      // Update card balances
      await connection.query(
        'UPDATE credit_cards SET cold_balance = ?, real_balance = ?, updated_at = NOW() WHERE id = ?',
        [newColdBalance, newRealBalance, card.id]
      );

      // Delete transaction
      await connection.query('DELETE FROM card_transactions WHERE id = ?', [transactionId]);

      await connection.commit();

      res.json({ message: 'Transaction deleted' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get all ad accounts with linked cards
router.get('/ad-accounts', authenticate, async (req, res, next) => {
  try {
    const [adAccounts] = await db.query(
      'SELECT * FROM ad_accounts ORDER BY name ASC'
    );

    // Get linked cards for each ad account
    for (const account of adAccounts) {
      const [cards] = await db.query(
        `SELECT c.* FROM credit_cards c
         INNER JOIN ad_account_cards aac ON c.id = aac.card_id
         WHERE aac.ad_account_id = ?
         ORDER BY c.name ASC`,
        [account.id]
      );
      account.linked_cards = cards;
    }

    res.json({ ad_accounts: adAccounts });
  } catch (error) {
    next(error);
  }
});

// Get single ad account
router.get('/ad-accounts/:id', authenticate, async (req, res, next) => {
  try {
    const accountId = req.params.id;

    const [accounts] = await db.query(
      'SELECT * FROM ad_accounts WHERE id = ?',
      [accountId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Ad account not found' });
    }

    const account = accounts[0];

    // Get linked cards
    const [cards] = await db.query(
      `SELECT c.* FROM credit_cards c
       INNER JOIN ad_account_cards aac ON c.id = aac.card_id
       WHERE aac.ad_account_id = ?
       ORDER BY c.name ASC`,
      [accountId]
    );

    account.linked_cards = cards;

    res.json({ ad_account: account });
  } catch (error) {
    next(error);
  }
});

// Create ad account
router.post('/ad-accounts', authenticate, auditLog('ad_account'), async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await db.query(
      `INSERT INTO ad_accounts (name, created_at)
       VALUES (?, NOW())`,
      [name.trim()]
    );

    const [newAccount] = await db.query(
      'SELECT * FROM ad_accounts WHERE id = ?',
      [result.insertId]
    );

    newAccount[0].linked_cards = [];

    res.status(201).json({ ad_account: newAccount[0] });
  } catch (error) {
    next(error);
  }
});

// Update ad account
router.put('/ad-accounts/:id', authenticate, auditLog('ad_account'), async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { name } = req.body;

    const [accounts] = await db.query(
      'SELECT * FROM ad_accounts WHERE id = ?',
      [accountId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Ad account not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await db.query(
      'UPDATE ad_accounts SET name = ?, updated_at = NOW() WHERE id = ?',
      [name.trim(), accountId]
    );

    const [updatedAccount] = await db.query(
      'SELECT * FROM ad_accounts WHERE id = ?',
      [accountId]
    );

    // Get linked cards
    const [cards] = await db.query(
      `SELECT c.* FROM credit_cards c
       INNER JOIN ad_account_cards aac ON c.id = aac.card_id
       WHERE aac.ad_account_id = ?
       ORDER BY c.name ASC`,
      [accountId]
    );

    updatedAccount[0].linked_cards = cards;

    res.json({ ad_account: updatedAccount[0] });
  } catch (error) {
    next(error);
  }
});

// Delete ad account
router.delete('/ad-accounts/:id', authenticate, auditLog('ad_account'), async (req, res, next) => {
  try {
    const accountId = req.params.id;

    const [accounts] = await db.query(
      'SELECT * FROM ad_accounts WHERE id = ?',
      [accountId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Ad account not found' });
    }

    // Links will be cascade deleted
    await db.query('DELETE FROM ad_accounts WHERE id = ?', [accountId]);

    res.json({ message: 'Ad account deleted' });
  } catch (error) {
    next(error);
  }
});

// Link card to ad account
router.post('/ad-accounts/:id/cards', authenticate, auditLog('ad_account_card'), async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { card_id } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    // Check if ad account exists
    const [accounts] = await db.query(
      'SELECT id FROM ad_accounts WHERE id = ?',
      [accountId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Ad account not found' });
    }

    // Check if card exists
    const [cards] = await db.query(
      'SELECT id FROM credit_cards WHERE id = ?',
      [card_id]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if link already exists
    const [existing] = await db.query(
      'SELECT id FROM ad_account_cards WHERE ad_account_id = ? AND card_id = ?',
      [accountId, card_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Card is already linked to this ad account' });
    }

    await db.query(
      'INSERT INTO ad_account_cards (ad_account_id, card_id, created_at) VALUES (?, ?, NOW())',
      [accountId, card_id]
    );

    res.status(201).json({ message: 'Card linked to ad account' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Card is already linked to this ad account' });
    }
    next(error);
  }
});

// Unlink card from ad account
router.delete('/ad-accounts/:id/cards/:cardId', authenticate, auditLog('ad_account_card'), async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const cardId = req.params.cardId;

    const [links] = await db.query(
      'SELECT id FROM ad_account_cards WHERE ad_account_id = ? AND card_id = ?',
      [accountId, cardId]
    );

    if (links.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await db.query(
      'DELETE FROM ad_account_cards WHERE ad_account_id = ? AND card_id = ?',
      [accountId, cardId]
    );

    res.json({ message: 'Card unlinked from ad account' });
  } catch (error) {
    next(error);
  }
});

// Get global summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const [cards] = await db.query('SELECT * FROM credit_cards');

    let totalColdBalance = 0;
    let totalRealBalance = 0;
    let totalDotation = 0;

    cards.forEach(card => {
      totalColdBalance += parseFloat(card.cold_balance);
      totalRealBalance += parseFloat(card.real_balance);
      totalDotation += parseFloat(card.dotation);
    });

    const totalBalance = totalColdBalance + totalRealBalance;
    const totalAvailableDotation = totalDotation - totalRealBalance;

    res.json({
      summary: {
        total_cold_balance: totalColdBalance,
        total_real_balance: totalRealBalance,
        total_balance: totalBalance,
        total_dotation: totalDotation,
        total_available_dotation: totalAvailableDotation,
        total_cards: cards.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

