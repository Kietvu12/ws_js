import { Event, EventParticipant } from '../../models/index.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/public/events/:id/register — đăng ký tham gia sự kiện (khách / landing, không cần CTV)
 */
export async function registerPublicEvent(req, res, next) {
  try {
    const { id } = req.params;
    const eventId = parseInt(id, 10);
    if (!Number.isFinite(eventId)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid event id' });
    }

    const { name, email, phone } = req.body || {};
    const nameTrim = String(name || '').trim();
    const emailTrim = String(email || '').trim().toLowerCase();
    const phoneTrim = String(phone || '').trim();

    if (nameTrim.length < 2) {
      return res.status(400).json({ success: false, code: 'NAME_REQUIRED', message: 'Name required' });
    }
    if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
      return res.status(400).json({ success: false, code: 'EMAIL_INVALID', message: 'Invalid email' });
    }

    const event = await Event.findByPk(eventId);
    if (!event || event.status !== 1) {
      return res.status(404).json({ success: false, code: 'EVENT_NOT_FOUND', message: 'Event not found' });
    }

    const now = new Date();
    if (event.endAt && new Date(event.endAt) < now) {
      return res.status(400).json({ success: false, code: 'EVENT_ENDED', message: 'Event has ended' });
    }

    const existed = await EventParticipant.findOne({
      where: {
        eventId,
        email: emailTrim,
        isInternal: false
      }
    });
    if (existed) {
      return res.status(200).json({
        success: true,
        code: 'ALREADY_REGISTERED',
        message: 'Already registered',
        data: { participant: existed }
      });
    }

    const participant = await EventParticipant.create({
      eventId,
      adminId: null,
      collaboratorId: null,
      email: emailTrim,
      name: nameTrim,
      phone: phoneTrim || null,
      isInternal: false
    });

    return res.status(201).json({
      success: true,
      message: 'Registered',
      data: { participant }
    });
  } catch (err) {
    next(err);
  }
}
