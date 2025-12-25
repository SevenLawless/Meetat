const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const validateMoney = (value) => {
  const n = asNumber(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
};

const withTransaction = async (fn) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    throw err;
  } finally {
    conn.release();
  }
};

const getOverview = async () => {
  const [[summary]] = await db.query(
    `SELECT
      IFNULL(SUM(cold_balance), 0) AS total_cold_balance,
      IFNULL(SUM(real_balance), 0) AS total_real_balance,
      IFNULL(SUM(cold_balance + real_balance), 0) AS total_balance,
      IFNULL(SUM(dotation_limit), 0) AS total_dotation_limit,
      IFNULL(SUM(dotation_limit - dotation_used), 0) AS total_dotation_left
     FROM marketing_cards`
  );

  const [cards] = await db.query(
    `SELECT
      id,
      name,
      last4,
      dotation_limit,
      dotation_used,
      (dotation_limit - dotation_used) AS dotation_left,
      cold_balance,
      real_balance,
      (cold_balance + real_balance) AS total_balance,
      created_at,
      updated_at
     FROM marketing_cards
     ORDER BY name ASC`
  );

  const [adAccounts] = await db.query(
    `SELECT id, name, created_at, updated_at
     FROM marketing_ad_accounts
     ORDER BY name ASC`
  );

  const [links] = await db.query(
    `SELECT aac.ad_account_id, c.id as card_id, c.name as card_name, c.last4 as card_last4
     FROM marketing_ad_account_cards aac
     JOIN marketing_cards c ON c.id = aac.card_id
     ORDER BY aac.ad_account_id ASC, c.name ASC`
  );

  const cardsByAdAccount = new Map();
  for (const row of links) {
    if (!cardsByAdAccount.has(row.ad_account_id)) cardsByAdAccount.set(row.ad_account_id, []);
    cardsByAdAccount.get(row.ad_account_id).push({ id: row.card_id, name: row.card_name, last4: row.card_last4 });
  }

  const enrichedAdAccounts = adAccounts.map((aa) => {
    const linked_cards = cardsByAdAccount.get(aa.id) || [];
    return {
      ...aa,
      linked_cards,
      linked_card_ids: linked_cards.map((c) => c.id)
    };
  });

  return { summary, cards, ad_accounts: enrichedAdAccounts };
};

router.get('/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = await getOverview();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/cards', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, last4, dotation_limit, cold_balance, real_balance } = req.body;

    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    if (!/^\d{4}$/.test(String(last4 || '').trim())) return res.status(400).json({ error: 'Last 4 digits must be exactly 4 digits' });

    const dotation = validateMoney(dotation_limit);
    const cold = validateMoney(cold_balance);
    const real = validateMoney(real_balance);

    if (dotation === null || dotation < 0) return res.status(400).json({ error: 'Dotation must be a positive number' });
    if (cold === null || cold < 0) return res.status(400).json({ error: 'Cold balance must be a positive number' });
    if (real === null || real < 0) return res.status(400).json({ error: 'Real balance must be a positive number' });

    const dotationUsed = real;
    if (dotationUsed > dotation) return res.status(400).json({ error: 'Real balance cannot exceed dotation' });

    const [existing] = await db.query('SELECT id FROM marketing_cards WHERE LOWER(name) = LOWER(?) LIMIT 1', [String(name).trim()]);
    if (existing.length > 0) return res.status(409).json({ error: 'Card name must be unique' });

    const [result] = await db.query(
      `INSERT INTO marketing_cards (name, last4, dotation_limit, dotation_used, cold_balance, real_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [String(name).trim(), String(last4).trim(), dotation, dotationUsed, cold, real]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

router.put('/cards/:cardId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const cardId = Number(req.params.cardId);
    const { name, last4, dotation_limit } = req.body;

    if (!cardId) return res.status(400).json({ error: 'Invalid card ID' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    if (!/^\d{4}$/.test(String(last4 || '').trim())) return res.status(400).json({ error: 'Last 4 digits must be exactly 4 digits' });

    const dotation = validateMoney(dotation_limit);
    if (dotation === null || dotation < 0) return res.status(400).json({ error: 'Dotation must be a positive number' });

    const [cards] = await db.query('SELECT id, dotation_used FROM marketing_cards WHERE id = ?', [cardId]);
    if (cards.length === 0) return res.status(404).json({ error: 'Card not found' });
    if (cards[0].dotation_used > dotation) return res.status(400).json({ error: 'Dotation cannot be less than current dotation usage' });

    const [existing] = await db.query(
      'SELECT id FROM marketing_cards WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
      [String(name).trim(), cardId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Card name must be unique' });

    await db.query(
      `UPDATE marketing_cards
       SET name = ?, last4 = ?, dotation_limit = ?, updated_at = NOW()
       WHERE id = ?`,
      [String(name).trim(), String(last4).trim(), dotation, cardId]
    );

    res.json({ id: cardId });
  } catch (err) {
    next(err);
  }
});

router.delete('/cards/:cardId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const cardId = Number(req.params.cardId);
    if (!cardId) return res.status(400).json({ error: 'Invalid card ID' });

    const [cards] = await db.query('SELECT id FROM marketing_cards WHERE id = ?', [cardId]);
    if (cards.length === 0) return res.status(404).json({ error: 'Card not found' });

    await db.query('DELETE FROM marketing_cards WHERE id = ?', [cardId]);
    res.json({ message: 'Card deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/cards/:cardId/transactions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const cardId = Number(req.params.cardId);
    if (!cardId) return res.status(400).json({ error: 'Invalid card ID' });

    const [transactions] = await db.query(
      `SELECT
        t.id,
        t.type,
        t.kind,
        t.card_id,
        t.source_card_id,
        t.ad_account_id,
        t.amount,
        t.note,
        t.created_at,
        u.name as created_by_name,
        aa.name as ad_account_name,
        sc.name as source_card_name
       FROM marketing_transactions t
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN marketing_ad_accounts aa ON aa.id = t.ad_account_id
       LEFT JOIN marketing_cards sc ON sc.id = t.source_card_id
       WHERE t.card_id = ?
       ORDER BY t.created_at DESC`,
      [cardId]
    );

    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

router.post('/ad-accounts', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, linked_card_ids = [] } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });

    const [existing] = await db.query('SELECT id FROM marketing_ad_accounts WHERE LOWER(name) = LOWER(?) LIMIT 1', [String(name).trim()]);
    if (existing.length > 0) return res.status(409).json({ error: 'Ad account name must be unique' });

    const cardIds = Array.isArray(linked_card_ids) ? linked_card_ids.map((id) => Number(id)).filter(Boolean) : [];

    const [result] = await withTransaction(async (conn) => {
      const [insert] = await conn.query(
        `INSERT INTO marketing_ad_accounts (name, created_at, updated_at)
         VALUES (?, NOW(), NOW())`,
        [String(name).trim()]
      );
      const adAccountId = insert.insertId;
      if (cardIds.length > 0) {
        const values = cardIds.map((cardId) => [adAccountId, cardId]);
        await conn.query('INSERT INTO marketing_ad_account_cards (ad_account_id, card_id) VALUES ?', [values]);
      }
      return [{ insertId: adAccountId }];
    });

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

router.put('/ad-accounts/:adAccountId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const adAccountId = Number(req.params.adAccountId);
    const { name, linked_card_ids = [] } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'Invalid ad account ID' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });

    const [accounts] = await db.query('SELECT id FROM marketing_ad_accounts WHERE id = ?', [adAccountId]);
    if (accounts.length === 0) return res.status(404).json({ error: 'Ad account not found' });

    const [existing] = await db.query(
      'SELECT id FROM marketing_ad_accounts WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
      [String(name).trim(), adAccountId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Ad account name must be unique' });

    const cardIds = Array.isArray(linked_card_ids) ? linked_card_ids.map((id) => Number(id)).filter(Boolean) : [];

    await withTransaction(async (conn) => {
      await conn.query(
        `UPDATE marketing_ad_accounts SET name = ?, updated_at = NOW() WHERE id = ?`,
        [String(name).trim(), adAccountId]
      );
      await conn.query('DELETE FROM marketing_ad_account_cards WHERE ad_account_id = ?', [adAccountId]);
      if (cardIds.length > 0) {
        const values = cardIds.map((cardId) => [adAccountId, cardId]);
        await conn.query('INSERT INTO marketing_ad_account_cards (ad_account_id, card_id) VALUES ?', [values]);
      }
    });

    res.json({ id: adAccountId });
  } catch (err) {
    next(err);
  }
});

router.delete('/ad-accounts/:adAccountId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const adAccountId = Number(req.params.adAccountId);
    if (!adAccountId) return res.status(400).json({ error: 'Invalid ad account ID' });

    await db.query('DELETE FROM marketing_ad_accounts WHERE id = ?', [adAccountId]);
    res.json({ message: 'Ad account deleted' });
  } catch (err) {
    next(err);
  }
});

const applyRevenueColdToReal = async (conn, { card_id, amount, note, userId }) => {
  const [cards] = await conn.query(
    `SELECT id, cold_balance, real_balance, dotation_limit, dotation_used
     FROM marketing_cards
     WHERE id = ?
     FOR UPDATE`,
    [card_id]
  );
  if (cards.length === 0) return { status: 404, error: 'Card not found' };
  const card = cards[0];

  if (card.cold_balance < amount) return { status: 400, error: 'Insufficient cold balance' };
  if (card.dotation_used + amount > card.dotation_limit) return { status: 400, error: 'Insufficient dotation left' };

  await conn.query(
    `UPDATE marketing_cards
     SET cold_balance = cold_balance - ?, real_balance = real_balance + ?, dotation_used = dotation_used + ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, amount, amount, card_id]
  );

  const [result] = await conn.query(
    `INSERT INTO marketing_transactions (type, kind, card_id, amount, note, created_by, created_at)
     VALUES ('revenue', 'cold_to_real', ?, ?, ?, ?, NOW())`,
    [card_id, amount, note || null, userId]
  );

  return { status: 201, data: { id: result.insertId } };
};

const applyRevenueFromOtherCardCold = async (conn, { source_card_id, target_card_id, amount, note, userId }) => {
  if (source_card_id === target_card_id) return { status: 400, error: 'Source and target cards must be different' };

  const [targetCards] = await conn.query(
    `SELECT id, dotation_limit, dotation_used
     FROM marketing_cards
     WHERE id = ?
     FOR UPDATE`,
    [target_card_id]
  );
  if (targetCards.length === 0) return { status: 404, error: 'Target card not found' };
  if (targetCards[0].dotation_used + amount > targetCards[0].dotation_limit) return { status: 400, error: 'Insufficient dotation left' };

  const [sourceCards] = await conn.query(
    `SELECT id, cold_balance
     FROM marketing_cards
     WHERE id = ?
     FOR UPDATE`,
    [source_card_id]
  );
  if (sourceCards.length === 0) return { status: 404, error: 'Source card not found' };
  if (sourceCards[0].cold_balance < amount) return { status: 400, error: 'Insufficient source cold balance' };

  await conn.query(
    `UPDATE marketing_cards
     SET cold_balance = cold_balance - ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, source_card_id]
  );

  await conn.query(
    `UPDATE marketing_cards
     SET real_balance = real_balance + ?, dotation_used = dotation_used + ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, amount, target_card_id]
  );

  const [result] = await conn.query(
    `INSERT INTO marketing_transactions (type, kind, card_id, source_card_id, amount, note, created_by, created_at)
     VALUES ('revenue', 'from_card_cold', ?, ?, ?, ?, ?, NOW())`,
    [target_card_id, source_card_id, amount, note || null, userId]
  );

  return { status: 201, data: { id: result.insertId } };
};

const applyExpenseSpend = async (conn, { card_id, ad_account_id, amount, note, userId }) => {
  const [cards] = await conn.query(
    `SELECT id, real_balance, dotation_limit, dotation_used
     FROM marketing_cards
     WHERE id = ?
     FOR UPDATE`,
    [card_id]
  );
  if (cards.length === 0) return { status: 404, error: 'Card not found' };
  const card = cards[0];

  if (card.real_balance < amount) return { status: 400, error: 'Insufficient real balance' };
  if (card.dotation_used + amount > card.dotation_limit) return { status: 400, error: 'Insufficient dotation left' };

  const [adAccounts] = await conn.query('SELECT id FROM marketing_ad_accounts WHERE id = ? LIMIT 1', [ad_account_id]);
  if (adAccounts.length === 0) return { status: 404, error: 'Ad account not found' };

  await conn.query(
    `UPDATE marketing_cards
     SET real_balance = real_balance - ?, dotation_used = dotation_used + ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, amount, card_id]
  );

  const [result] = await conn.query(
    `INSERT INTO marketing_transactions (type, kind, card_id, ad_account_id, amount, note, created_by, created_at)
     VALUES ('expense', 'spend_ad_account', ?, ?, ?, ?, ?, NOW())`,
    [card_id, ad_account_id, amount, note || null, userId]
  );

  return { status: 201, data: { id: result.insertId } };
};

const applyExpenseRealToCold = async (conn, { card_id, amount, note, userId }) => {
  const [cards] = await conn.query(
    `SELECT id, cold_balance, real_balance, dotation_used
     FROM marketing_cards
     WHERE id = ?
     FOR UPDATE`,
    [card_id]
  );
  if (cards.length === 0) return { status: 404, error: 'Card not found' };
  const card = cards[0];

  if (card.real_balance < amount) return { status: 400, error: 'Insufficient real balance' };
  if (card.dotation_used < amount) return { status: 400, error: 'Cannot restore more dotation than used' };

  await conn.query(
    `UPDATE marketing_cards
     SET real_balance = real_balance - ?, cold_balance = cold_balance + ?, dotation_used = dotation_used - ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, amount, amount, card_id]
  );

  const [result] = await conn.query(
    `INSERT INTO marketing_transactions (type, kind, card_id, amount, note, created_by, created_at)
     VALUES ('expense', 'real_to_cold', ?, ?, ?, ?, NOW())`,
    [card_id, amount, note || null, userId]
  );

  return { status: 201, data: { id: result.insertId } };
};

router.post('/transactions/revenue/cold-to-real', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const card_id = Number(req.body.card_id);
    const amount = validateMoney(req.body.amount);
    const note = req.body.note;

    if (!card_id) return res.status(400).json({ error: 'Card ID is required' });
    if (amount === null || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await withTransaction((conn) =>
      applyRevenueColdToReal(conn, { card_id, amount, note, userId: req.userId })
    );

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json(result.data);
  } catch (err) {
    next(err);
  }
});

router.post('/transactions/revenue/from-card-cold', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const source_card_id = Number(req.body.source_card_id);
    const target_card_id = Number(req.body.target_card_id);
    const amount = validateMoney(req.body.amount);
    const note = req.body.note;

    if (!source_card_id || !target_card_id) return res.status(400).json({ error: 'Source and target card IDs are required' });
    if (amount === null || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await withTransaction((conn) =>
      applyRevenueFromOtherCardCold(conn, { source_card_id, target_card_id, amount, note, userId: req.userId })
    );

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json(result.data);
  } catch (err) {
    next(err);
  }
});

router.post('/transactions/expense/spend', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const card_id = Number(req.body.card_id);
    const ad_account_id = Number(req.body.ad_account_id);
    const amount = validateMoney(req.body.amount);
    const note = req.body.note;

    if (!card_id) return res.status(400).json({ error: 'Card ID is required' });
    if (!ad_account_id) return res.status(400).json({ error: 'Ad account ID is required' });
    if (amount === null || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await withTransaction((conn) =>
      applyExpenseSpend(conn, { card_id, ad_account_id, amount, note, userId: req.userId })
    );

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json(result.data);
  } catch (err) {
    next(err);
  }
});

router.post('/transactions/expense/real-to-cold', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const card_id = Number(req.body.card_id);
    const amount = validateMoney(req.body.amount);
    const note = req.body.note;

    if (!card_id) return res.status(400).json({ error: 'Card ID is required' });
    if (amount === null || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const result = await withTransaction((conn) =>
      applyExpenseRealToCold(conn, { card_id, amount, note, userId: req.userId })
    );

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(result.status).json(result.data);
  } catch (err) {
    next(err);
  }
});

router.delete('/transactions/:transactionId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const transactionId = Number(req.params.transactionId);
    if (!transactionId) return res.status(400).json({ error: 'Invalid transaction ID' });

    const result = await withTransaction(async (conn) => {
      const [txRows] = await conn.query(
        `SELECT id, type, kind, card_id, source_card_id, ad_account_id, amount
         FROM marketing_transactions
         WHERE id = ?
         FOR UPDATE`,
        [transactionId]
      );
      if (txRows.length === 0) return { status: 404, error: 'Transaction not found' };
      const tx = txRows[0];

      if (tx.kind === 'cold_to_real') {
        const [cards] = await conn.query(
          `SELECT cold_balance, real_balance, dotation_used
           FROM marketing_cards
           WHERE id = ?
           FOR UPDATE`,
          [tx.card_id]
        );
        if (cards.length === 0) return { status: 409, error: 'Card missing' };
        if (cards[0].real_balance < tx.amount) return { status: 409, error: 'Cannot delete: real balance would go negative' };
        if (cards[0].dotation_used < tx.amount) return { status: 409, error: 'Cannot delete: dotation usage would go negative' };

        await conn.query(
          `UPDATE marketing_cards
           SET cold_balance = cold_balance + ?, real_balance = real_balance - ?, dotation_used = dotation_used - ?, updated_at = NOW()
           WHERE id = ?`,
          [tx.amount, tx.amount, tx.amount, tx.card_id]
        );
      } else if (tx.kind === 'from_card_cold') {
        const [targetCards] = await conn.query(
          `SELECT real_balance, dotation_used
           FROM marketing_cards
           WHERE id = ?
           FOR UPDATE`,
          [tx.card_id]
        );
        if (targetCards.length === 0) return { status: 409, error: 'Target card missing' };
        if (targetCards[0].real_balance < tx.amount) return { status: 409, error: 'Cannot delete: target real balance would go negative' };
        if (targetCards[0].dotation_used < tx.amount) return { status: 409, error: 'Cannot delete: target dotation usage would go negative' };

        const [sourceCards] = await conn.query(
          `SELECT cold_balance
           FROM marketing_cards
           WHERE id = ?
           FOR UPDATE`,
          [tx.source_card_id]
        );
        if (sourceCards.length === 0) return { status: 409, error: 'Source card missing' };

        await conn.query(
          `UPDATE marketing_cards
           SET cold_balance = cold_balance + ?, updated_at = NOW()
           WHERE id = ?`,
          [tx.amount, tx.source_card_id]
        );

        await conn.query(
          `UPDATE marketing_cards
           SET real_balance = real_balance - ?, dotation_used = dotation_used - ?, updated_at = NOW()
           WHERE id = ?`,
          [tx.amount, tx.amount, tx.card_id]
        );
      } else if (tx.kind === 'spend_ad_account') {
        const [cards] = await conn.query(
          `SELECT dotation_limit, dotation_used
           FROM marketing_cards
           WHERE id = ?
           FOR UPDATE`,
          [tx.card_id]
        );
        if (cards.length === 0) return { status: 409, error: 'Card missing' };
        if (cards[0].dotation_used < tx.amount) return { status: 409, error: 'Cannot delete: dotation usage would go negative' };

        await conn.query(
          `UPDATE marketing_cards
           SET real_balance = real_balance + ?, dotation_used = dotation_used - ?, updated_at = NOW()
           WHERE id = ?`,
          [tx.amount, tx.amount, tx.card_id]
        );
      } else if (tx.kind === 'real_to_cold') {
        const [cards] = await conn.query(
          `SELECT cold_balance, dotation_limit, dotation_used
           FROM marketing_cards
           WHERE id = ?
           FOR UPDATE`,
          [tx.card_id]
        );
        if (cards.length === 0) return { status: 409, error: 'Card missing' };
        if (cards[0].cold_balance < tx.amount) return { status: 409, error: 'Cannot delete: cold balance would go negative' };
        if (cards[0].dotation_used + tx.amount > cards[0].dotation_limit) return { status: 409, error: 'Cannot delete: insufficient dotation left' };

        await conn.query(
          `UPDATE marketing_cards
           SET real_balance = real_balance + ?, cold_balance = cold_balance - ?, dotation_used = dotation_used + ?, updated_at = NOW()
           WHERE id = ?`,
          [tx.amount, tx.amount, tx.amount, tx.card_id]
        );
      } else {
        return { status: 400, error: 'Unsupported transaction kind' };
      }

      await conn.query('DELETE FROM marketing_transactions WHERE id = ?', [transactionId]);
      return { status: 200, data: { message: 'Transaction deleted' } };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

