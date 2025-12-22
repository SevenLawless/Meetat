const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Check project access
const checkProjectAccess = async (projectId, userId) => {
  const [access] = await db.query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return access.length > 0;
};

// Get all campaigns for a project
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    if (!await checkProjectAccess(projectId, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [campaigns] = await db.query(
      `SELECT c.*,
        (SELECT SUM(impressions) FROM ad_metrics WHERE campaign_id = c.id) as total_impressions,
        (SELECT SUM(clicks) FROM ad_metrics WHERE campaign_id = c.id) as total_clicks,
        (SELECT SUM(spend) FROM ad_metrics WHERE campaign_id = c.id) as total_spend,
        (SELECT SUM(conversions) FROM ad_metrics WHERE campaign_id = c.id) as total_conversions
       FROM ad_campaigns c
       WHERE c.project_id = ?
       ORDER BY c.created_at DESC`,
      [projectId]
    );

    res.json({ campaigns });
  } catch (error) {
    next(error);
  }
});

// Get single campaign with metrics
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [campaigns] = await db.query(
      'SELECT * FROM ad_campaigns WHERE id = ?',
      [req.params.id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    if (!await checkProjectAccess(campaign.project_id, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get daily metrics
    const [metrics] = await db.query(
      `SELECT * FROM ad_metrics 
       WHERE campaign_id = ? 
       ORDER BY date ASC`,
      [req.params.id]
    );

    res.json({ campaign: { ...campaign, metrics } });
  } catch (error) {
    next(error);
  }
});

// Create campaign
router.post('/', authenticate, auditLog('campaign'), async (req, res, next) => {
  try {
    const { project_id, name, channel, start_date, end_date } = req.body;

    if (!project_id || !name || !channel) {
      return res.status(400).json({ error: 'Project ID, name, and channel are required' });
    }

    if (!await checkProjectAccess(project_id, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validChannels = ['facebook', 'google', 'tiktok', 'instagram', 'twitter', 'linkedin', 'youtube', 'other'];
    if (!validChannels.includes(channel.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid channel. Must be one of: ' + validChannels.join(', ') });
    }

    const [result] = await db.query(
      `INSERT INTO ad_campaigns (project_id, name, channel, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [project_id, name, channel.toLowerCase(), start_date || null, end_date || null]
    );

    res.status(201).json({
      id: result.insertId,
      project_id,
      name,
      channel: channel.toLowerCase(),
      start_date,
      end_date
    });
  } catch (error) {
    next(error);
  }
});

// Update campaign
router.put('/:id', authenticate, auditLog('campaign'), async (req, res, next) => {
  try {
    const { name, channel, start_date, end_date } = req.body;
    const campaignId = req.params.id;

    const [campaigns] = await db.query(
      'SELECT * FROM ad_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!await checkProjectAccess(campaigns[0].project_id, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query(
      `UPDATE ad_campaigns SET name = ?, channel = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [
        name || campaigns[0].name,
        channel || campaigns[0].channel,
        start_date !== undefined ? start_date : campaigns[0].start_date,
        end_date !== undefined ? end_date : campaigns[0].end_date,
        campaignId
      ]
    );

    res.json({ message: 'Campaign updated', id: parseInt(campaignId) });
  } catch (error) {
    next(error);
  }
});

// Delete campaign
router.delete('/:id', authenticate, auditLog('campaign'), async (req, res, next) => {
  try {
    const campaignId = req.params.id;

    const [campaigns] = await db.query(
      'SELECT * FROM ad_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!await checkProjectAccess(campaigns[0].project_id, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM ad_metrics WHERE campaign_id = ?', [campaignId]);
    await db.query('DELETE FROM ad_campaigns WHERE id = ?', [campaignId]);

    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    next(error);
  }
});

// Bulk ingest daily metrics
router.post('/:id/metrics', authenticate, auditLog('ad_metrics'), async (req, res, next) => {
  try {
    const campaignId = req.params.id;
    const { metrics } = req.body;

    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Metrics array is required' });
    }

    const [campaigns] = await db.query(
      'SELECT * FROM ad_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!await checkProjectAccess(campaigns[0].project_id, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Insert or update metrics
    for (const metric of metrics) {
      const { date, impressions, clicks, spend, conversions } = metric;

      if (!date) continue;

      // Check if metric exists for this date
      const [existing] = await db.query(
        'SELECT id FROM ad_metrics WHERE campaign_id = ? AND date = ?',
        [campaignId, date]
      );

      if (existing.length > 0) {
        // Update existing
        await db.query(
          `UPDATE ad_metrics 
           SET impressions = ?, clicks = ?, spend = ?, conversions = ?
           WHERE id = ?`,
          [impressions || 0, clicks || 0, spend || 0, conversions || 0, existing[0].id]
        );
      } else {
        // Insert new
        await db.query(
          `INSERT INTO ad_metrics (campaign_id, date, impressions, clicks, spend, conversions)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [campaignId, date, impressions || 0, clicks || 0, spend || 0, conversions || 0]
        );
      }
    }

    res.json({ message: 'Metrics ingested', count: metrics.length });
  } catch (error) {
    next(error);
  }
});

// Get aggregated metrics for a project
router.get('/project/:projectId/aggregate', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!await checkProjectAccess(projectId, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let dateFormat;
    switch (group_by) {
      case 'week':
        dateFormat = '%Y-%u'; // Year-Week
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    let query = `
      SELECT 
        DATE_FORMAT(m.date, '${dateFormat}') as period,
        SUM(m.impressions) as impressions,
        SUM(m.clicks) as clicks,
        SUM(m.spend) as spend,
        SUM(m.conversions) as conversions,
        ROUND(SUM(m.clicks) / NULLIF(SUM(m.impressions), 0) * 100, 2) as ctr,
        ROUND(SUM(m.spend) / NULLIF(SUM(m.clicks), 0), 2) as cpc,
        ROUND(SUM(m.spend) / NULLIF(SUM(m.conversions), 0), 2) as cpa
      FROM ad_metrics m
      JOIN ad_campaigns c ON m.campaign_id = c.id
      WHERE c.project_id = ?
    `;
    const params = [projectId];

    if (start_date) {
      query += ' AND m.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND m.date <= ?';
      params.push(end_date);
    }

    query += ` GROUP BY period ORDER BY period ASC`;

    const [aggregates] = await db.query(query, params);

    // Get totals
    const [totals] = await db.query(
      `SELECT 
        SUM(m.impressions) as total_impressions,
        SUM(m.clicks) as total_clicks,
        SUM(m.spend) as total_spend,
        SUM(m.conversions) as total_conversions,
        ROUND(SUM(m.clicks) / NULLIF(SUM(m.impressions), 0) * 100, 2) as overall_ctr,
        ROUND(SUM(m.spend) / NULLIF(SUM(m.clicks), 0), 2) as overall_cpc,
        ROUND(SUM(m.spend) / NULLIF(SUM(m.conversions), 0), 2) as overall_cpa
       FROM ad_metrics m
       JOIN ad_campaigns c ON m.campaign_id = c.id
       WHERE c.project_id = ?`,
      [projectId]
    );

    // Get by channel
    const [byChannel] = await db.query(
      `SELECT 
        c.channel,
        SUM(m.impressions) as impressions,
        SUM(m.clicks) as clicks,
        SUM(m.spend) as spend,
        SUM(m.conversions) as conversions
       FROM ad_metrics m
       JOIN ad_campaigns c ON m.campaign_id = c.id
       WHERE c.project_id = ?
       GROUP BY c.channel`,
      [projectId]
    );

    res.json({
      daily: aggregates,
      totals: totals[0],
      by_channel: byChannel
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

