import { Post, Category, PostEvent, Event } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import {
  POST_VISIBILITY_AGENT_HOME,
  POST_VISIBILITY_PUBLIC_CTV,
  POST_VISIBILITY_PUBLIC_CANDIDATE
} from '../../constants/postVisibility.js';
import { resolveS3DisplayUrl, attachResolvedPostBodyHtml } from '../../utils/postHtmlS3.js';

/** Public list/detail: query surface=collaborator | candidate; omit => either public landing */
function postVisibilityWhereForRequest(req) {
  const isPublic = String(req.baseUrl || '').includes('/public/posts');
  if (!isPublic) {
    return sequelize.where(
      sequelize.literal(`(\`Post\`.\`visibility_mask\` & ${POST_VISIBILITY_AGENT_HOME})`),
      Op.gt,
      0
    );
  }
  const surface = String(req.query.surface || '').toLowerCase();
  if (surface === 'candidate') {
    return sequelize.where(
      sequelize.literal(`(\`Post\`.\`visibility_mask\` & ${POST_VISIBILITY_PUBLIC_CANDIDATE})`),
      Op.gt,
      0
    );
  }
  if (surface === 'collaborator') {
    return sequelize.where(
      sequelize.literal(`(\`Post\`.\`visibility_mask\` & ${POST_VISIBILITY_PUBLIC_CTV})`),
      Op.gt,
      0
    );
  }
  const publicBits = POST_VISIBILITY_PUBLIC_CTV | POST_VISIBILITY_PUBLIC_CANDIDATE;
  return sequelize.where(
    sequelize.literal(`(\`Post\`.\`visibility_mask\` & ${publicBits})`),
    Op.gt,
    0
  );
}

const mapOrderField = (fieldName) => {
  const fieldMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    publishedAt: 'published_at',
    viewCount: 'view_count',
    likeCount: 'like_count'
  };
  return fieldMap[fieldName] || fieldName;
};

async function resolvePostThumbnailUrl(thumbnail) {
  return resolveS3DisplayUrl(thumbnail);
}

/**
 * Post Controller (CTV + public posts)
 * Published only (status = 2), filtered by visibility_mask surface.
 */
export const postController = {
  getPosts: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoryId,
        sortBy = 'published_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const andParts = [postVisibilityWhereForRequest(req), { status: 2 }];

      if (search && String(search).trim()) {
        const term = `%${String(search).trim()}%`;
        andParts.push({
          [Op.or]: [
            { title: { [Op.like]: term } },
            { titleEn: { [Op.like]: term } },
            { titleJp: { [Op.like]: term } },
            { slug: { [Op.like]: term } },
            { content: { [Op.like]: term } },
            { contentEn: { [Op.like]: term } },
            { contentJp: { [Op.like]: term } }
          ]
        });
      }

      if (categoryId) {
        andParts.push({ categoryId: categoryId.toString() });
      }

      const where = { [Op.and]: andParts };

      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'likeCount', 'title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await Post.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            required: false,
            attributes: ['id', 'name', 'slug', 'color', 'sortOrder']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      for (const post of rows) {
        if (post.thumbnail) {
          post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
        }
        await attachResolvedPostBodyHtml(post);
      }

      res.json({
        success: true,
        data: {
          posts: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  getPostById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const post = await Post.findOne({
        where: {
          [Op.and]: [{ id }, { status: 2 }, postVisibilityWhereForRequest(req)]
        }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy post hoặc post chưa được publish'
        });
      }

      if (post.thumbnail) {
        post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
      }
      await attachResolvedPostBodyHtml(post);

      let linkedEvent = null;
      const pe = await PostEvent.findOne({
        where: { postId: id },
        order: [['id', 'ASC']]
      });
      if (pe) {
        const ev = await Event.findOne({
          where: { id: pe.eventId, status: 1 }
        });
        if (ev) {
          linkedEvent = {
            id: ev.id,
            title: ev.title,
            description: ev.description,
            startAt: ev.startAt,
            endAt: ev.endAt,
            location: ev.location
          };
        }
      }

      res.json({
        success: true,
        data: { post, linkedEvent }
      });
    } catch (error) {
      next(error);
    }
  }
};
