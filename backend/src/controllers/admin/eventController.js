import { Event, Post, EventParticipant, Collaborator } from '../../models/index.js';
import { Op } from 'sequelize';

/**
 * Admin Event controller
 * GET/POST /api/admin/events, GET/PUT/DELETE /api/admin/events/:id
 */
export const eventController = {
  /**
   * GET /api/admin/events - list events with pagination and filters
   */
  list: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        eventDateFrom,
        eventDateTo,
        sortBy = 'start_at',
        sortOrder = 'DESC',
      } = req.query;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where = {};

      if (search && search.trim()) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search.trim()}%` } },
          { location: { [Op.like]: `%${search.trim()}%` } },
          { description: { [Op.like]: `%${search.trim()}%` } },
        ];
      }
      if (status !== undefined && status !== '') {
        where.status = parseInt(status, 10);
      }
      if (eventDateFrom || eventDateTo) {
        where.startAt = {};
        if (eventDateFrom) where.startAt[Op.gte] = new Date(eventDateFrom);
        if (eventDateTo) where.startAt[Op.lte] = new Date(eventDateTo);
      }

      const orderField = ['start_at', 'end_at', 'title', 'created_at'].includes(sortBy) ? sortBy : 'start_at';
      const orderDir = (sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const orderAttr = orderField === 'start_at' ? 'startAt' : orderField === 'end_at' ? 'endAt' : orderField === 'title' ? 'title' : 'createdAt';

      const { count, rows } = await Event.findAndCountAll({
        where,
        limit: parseInt(limit, 10),
        offset,
        order: [[orderAttr, orderDir], ['id', 'ASC']],
      });

      const totalPages = Math.ceil(count / parseInt(limit, 10)) || 1;
      const events = rows.map((e) => {
        const plain = e.get ? e.get({ plain: true }) : e;
        return {
          ...plain,
          start_at: plain.start_at || plain.startAt,
          end_at: plain.end_at || plain.endAt,
        };
      });

      return res.json({
        success: true,
        data: {
          events,
          pagination: {
            total: count,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages,
          },
        },
      });
    } catch (err) {
      console.error('Event list error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải danh sách sự kiện' });
    }
  },

  /**
   * GET /api/admin/events/:id - get one event
   */
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
          {
            model: EventParticipant,
            as: 'participants',
            required: false,
            include: [
              {
                model: Collaborator,
                as: 'collaborator',
                required: false,
                attributes: ['id', 'name', 'email', 'phone', 'code'],
              },
            ],
          },
        ],
        order: [
          [Post, 'publishedAt', 'DESC'],
          [Post, 'id', 'DESC'],
          [{ model: EventParticipant, as: 'participants' }, 'created_at', 'DESC'],
        ],
      });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }
      const plain = event.get ? event.get({ plain: true }) : event;
      return res.json({
        success: true,
        data: {
          event: {
            ...plain,
            start_at: plain.start_at || plain.startAt,
            end_at: plain.end_at || plain.endAt,
          },
        },
      });
    } catch (err) {
      console.error('Event getById error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi tải sự kiện' });
    }
  },

  /**
   * POST /api/admin/events - create event
   */
  create: async (req, res) => {
    try {
      const adminId = req.user?.id ?? null;
      const { title, description, start_at, end_at, location, status } = req.body;
      if (!title || !start_at) {
        return res.status(400).json({ success: false, message: 'Tiêu đề và thời gian bắt đầu là bắt buộc' });
      }
      const event = await Event.create({
        title: title.trim(),
        description: description?.trim() || null,
        startAt: new Date(start_at),
        endAt: end_at ? new Date(end_at) : null,
        location: location?.trim() || null,
        status: status !== undefined ? parseInt(status, 10) : 1,
        createdBy: adminId,
      });
      const plain = event.get ? event.get({ plain: true }) : event;
      return res.status(201).json({
        success: true,
        message: 'Tạo sự kiện thành công',
        data: {
          event: {
            ...plain,
            start_at: plain.start_at || plain.startAt,
            end_at: plain.end_at || plain.endAt,
          },
        },
      });
    } catch (err) {
      console.error('Event create error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi tạo sự kiện' });
    }
  },

  /**
   * PUT /api/admin/events/:id - update event
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByPk(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }
      const { title, description, start_at, end_at, location, status } = req.body;
      if (title !== undefined) event.title = title.trim();
      if (description !== undefined) event.description = description?.trim() || null;
      if (start_at !== undefined) event.startAt = new Date(start_at);
      if (end_at !== undefined) event.endAt = end_at ? new Date(end_at) : null;
      if (location !== undefined) event.location = location?.trim() || null;
      if (status !== undefined) event.status = parseInt(status, 10);
      await event.save();
      const plain = event.get ? event.get({ plain: true }) : event;
      return res.json({
        success: true,
        message: 'Cập nhật sự kiện thành công',
        data: {
          event: {
            ...plain,
            start_at: plain.start_at || plain.startAt,
            end_at: plain.end_at || plain.endAt,
          },
        },
      });
    } catch (err) {
      console.error('Event update error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi cập nhật sự kiện' });
    }
  },

  /**
   * DELETE /api/admin/events/:id - soft delete event
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByPk(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }
      await event.destroy();
      return res.json({ success: true, message: 'Đã xóa sự kiện' });
    } catch (err) {
      console.error('Event delete error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi khi xóa sự kiện' });
    }
  },
};
