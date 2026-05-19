import { Event, Post, EventParticipant } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * CTV Event controller
 * GET /api/ctv/events
 * GET /api/ctv/events/:id
 * POST /api/ctv/events/:id/register
 */
/** Express có thể trả query dạng mảng nếu trùng key — lấy phần tử đầu */
function queryScalar(v) {
  if (v === undefined || v === null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const ctvEventController = {
  list: async (req, res) => {
    try {
      const page = queryScalar(req.query.page) ?? 1;
      const limit = queryScalar(req.query.limit) ?? 10;
      const upcoming = queryScalar(req.query.upcoming);
      const past = queryScalar(req.query.past);
      const participated = queryScalar(req.query.participated);
      const search = queryScalar(req.query.search);
      const startFrom = queryScalar(req.query.startFrom);
      const startTo = queryScalar(req.query.startTo);
      const sortBy = queryScalar(req.query.sortBy) ?? 'start_at';
      const sortOrder = queryScalar(req.query.sortOrder) ?? 'ASC';

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 10));
      const offset = (pageNum - 1) * limitNum;
      /** Không hiển thị sự kiện đã hủy (0); mọi giá trị khác 0 đều được list (tránh lệch DB legacy) */
      const where = { status: { [Op.ne]: 0 } };
      const now = new Date();
      const collaboratorId = req.collaborator?.id;

      /** Chỉ sự kiện CTV đã đăng ký tham gia */
      if (String(participated) === '1') {
        if (!collaboratorId) {
          return res.json({
            success: true,
            data: {
              events: [],
              pagination: {
                total: 0,
                page: pageNum,
                limit: limitNum,
                totalPages: 0,
              },
            },
          });
        }
        const subs = await EventParticipant.findAll({
          where: { collaboratorId },
          attributes: ['eventId'],
        });
        const ids = [...new Set(subs.map((s) => s.eventId).filter(Boolean))];
        if (ids.length === 0) {
          return res.json({
            success: true,
            data: {
              events: [],
              pagination: {
                total: 0,
                page: pageNum,
                limit: limitNum,
                totalPages: 0,
              },
            },
          });
        }
        where.id = { [Op.in]: ids };
      }

      if (String(past) === '1') {
        where[Op.or] = [
          { endAt: { [Op.lt]: now } },
          { endAt: null, startAt: { [Op.lt]: now } },
        ];
      } else if (String(upcoming) === '1') {
        let minStart = now;
        if (startFrom) {
          const d = new Date(startFrom);
          if (!Number.isNaN(d.getTime()) && d > minStart) minStart = d;
        }
        const startRange = { [Op.gte]: minStart };
        if (startTo) {
          const endD = new Date(startTo);
          endD.setHours(23, 59, 59, 999);
          if (!Number.isNaN(endD.getTime())) startRange[Op.lte] = endD;
        }
        where.startAt = startRange;
      } else {
        /** Tất cả (không lọc upcoming/past): vẫn áp dụng khoảng ngày bắt đầu nếu có */
        const sf = {};
        if (startFrom) {
          const d = new Date(startFrom);
          if (!Number.isNaN(d.getTime())) sf[Op.gte] = d;
        }
        if (startTo) {
          const d = new Date(startTo);
          d.setHours(23, 59, 59, 999);
          if (!Number.isNaN(d.getTime())) sf[Op.lte] = d;
        }
        if (Object.keys(sf).length) where.startAt = sf;
      }

      if (search && String(search).trim()) {
        const q = `%${String(search).trim().replace(/%/g, '\\%')}%`;
        where.title = { [Op.like]: q };
      }

      const orderField = ['start_at', 'end_at', 'title', 'created_at'].includes(sortBy) ? sortBy : 'start_at';
      const orderDir = (sortOrder || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const orderAttr =
        orderField === 'start_at' ? 'startAt' :
        orderField === 'end_at' ? 'endAt' :
        orderField === 'title' ? 'title' : 'createdAt';

      const { count, rows } = await Event.findAndCountAll({
        where,
        limit: limitNum,
        offset,
        order: [[orderAttr, orderDir], ['id', 'ASC']],
      });

      const totalPages = Math.ceil(count / limitNum) || 1;
      const eventIds = rows.map((e) => e.id);
      let registeredSet = new Set();
      if (collaboratorId && eventIds.length) {
        const parts = await EventParticipant.findAll({
          where: {
            collaboratorId,
            eventId: { [Op.in]: eventIds },
          },
          attributes: ['eventId'],
        });
        registeredSet = new Set(parts.map((p) => p.eventId));
      }

      const events = rows.map((e) => {
        const plain = e.get ? e.get({ plain: true }) : e;
        return {
          ...plain,
          start_at: plain.start_at || plain.startAt,
          end_at: plain.end_at || plain.endAt,
          is_registered: registeredSet.has(plain.id),
        };
      });

      return res.json({
        success: true,
        data: {
          events,
          pagination: {
            total: count,
            page: pageNum,
            limit: limitNum,
            totalPages,
          },
        },
      });
    } catch (err) {
      console.error('CTV Event list error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải danh sách sự kiện' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByPk(id, {
        include: [
          {
            model: Post,
            through: { attributes: [] },
            required: false,
            where: { status: 1 },
          },
        ],
        order: [[Post, 'publishedAt', 'DESC'], [Post, 'id', 'DESC']],
      });

      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }

      const plain = event.get ? event.get({ plain: true }) : event;
      const collaboratorId = req.collaborator?.id;

      let isRegistered = false;
      if (collaboratorId) {
        const existed = await EventParticipant.findOne({
          where: { eventId: id, collaboratorId },
        });
        isRegistered = !!existed;
      }

      return res.json({
        success: true,
        data: {
          event: {
            ...plain,
            start_at: plain.start_at || plain.startAt,
            end_at: plain.end_at || plain.endAt,
            is_registered: isRegistered,
          },
        },
      });
    } catch (err) {
      console.error('CTV Event getById error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải sự kiện' });
    }
  },

  register: async (req, res) => {
    try {
      const { id } = req.params;
      const collaboratorId = req.collaborator?.id;
      const { name, email, phone } = req.body || {};

      const event = await Event.findByPk(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }

      const existed = await EventParticipant.findOne({
        where: { eventId: id, collaboratorId },
      });
      if (existed) {
        return res.json({ success: true, message: 'Đã đăng ký sự kiện', data: { participant: existed } });
      }

      const participant = await EventParticipant.create({
        eventId: id,
        collaboratorId,
        email: (email || '').trim() || null,
        name: (name || '').trim() || null,
        phone: (phone || '').trim() || null,
        isInternal: true,
      });

      return res.status(201).json({
        success: true,
        message: 'Đăng ký sự kiện thành công',
        data: { participant },
      });
    } catch (err) {
      console.error('CTV Event register error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi đăng ký sự kiện' });
    }
  },
};

