import { Post, Category, Admin, ActionLog, PostEvent } from '../../models/index.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import config from '../../config/index.js';
import {
  uploadBufferToS3,
  getSignedUrlForFile,
  buildPostImageKey,
  buildPostTempImageKey,
  buildPostThumbnailKey,
  buildPostTempThumbnailKey,
  copyPostTempThumbnailToPost,
  s3Enabled
} from '../../services/s3Service.js';
import {
  normalizePostHtmlS3ToKeys,
  normalizePostMediaFieldToKey,
  resolveS3DisplayUrl,
  attachResolvedPostBodyHtml
} from '../../utils/postHtmlS3.js';
import { normalizePostVisibilityMask } from '../../constants/postVisibility.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'publishedAt': 'published_at',
    'viewCount': 'view_count',
    'likeCount': 'like_count'
  };
  return fieldMap[fieldName] || fieldName;
};

// DB uses title_jp, content_jp, ...; frontend expects titleJa, contentJa, ...
const serializePostForFrontend = (p, eventIdValue = null) => {
  const j = p && typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
  const out = {
    ...j,
    titleJa: j.titleJp,
    contentJa: j.contentJp,
    metaTitleJa: j.metaTitleJp,
    metaDescriptionJa: j.metaDescriptionJp,
    slugEn: j.slugEn ?? '',
    slugJa: j.slugJa ?? ''
  };
  if (eventIdValue !== undefined && eventIdValue !== null) {
    out.eventId = eventIdValue;
  }
  return out;
};

/** Thumbnail / ảnh meta: key S3 hoặc URL S3 cũ → presigned mới; URL ngoài giữ nguyên. */
async function resolvePostThumbnailUrl(thumbnail) {
  return resolveS3DisplayUrl(thumbnail);
}

/**
 * Post Management Controller (Admin)
 */
export const postController = {
  /**
   * Get list of posts
   * GET /api/admin/posts
   */
  getPosts: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        type,
        categoryId,
        authorId,
        publishedFrom,
        publishedTo,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by title, slug, or content
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by status
      if (status !== undefined) {
        where.status = parseInt(status);
      }

      // Filter by type
      if (type !== undefined) {
        where.type = parseInt(type);
      }

      // Filter by category (category_id is string)
      if (categoryId) {
        where.categoryId = categoryId.toString();
      }

      // Filter by author
      if (authorId) {
        where.authorId = parseInt(authorId);
      }

      // Filter by published date
      if (publishedFrom || publishedTo) {
        where.published_at = {};
        if (publishedFrom) {
          where.published_at[Op.gte] = new Date(publishedFrom);
        }
        if (publishedTo) {
          where.published_at[Op.lte] = new Date(publishedTo);
        }
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'title', 'status', 'publishedAt', 'viewCount', 'likeCount', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const { count, rows } = await Post.findAndCountAll({
        where,
        include: [
          {
            model: Admin,
            as: 'author',
            required: false,
            attributes: ['id', 'name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Get category info for each post (category_id is string)
      for (const post of rows) {
        if (post.categoryId) {
          const category = await Category.findByPk(post.categoryId);
          post.dataValues.category = category;
        } else {
          post.dataValues.category = null;
        }
        if (post.thumbnail) {
          post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
        }
        await attachResolvedPostBodyHtml(post);
      }

      res.json({
        success: true,
        data: {
          posts: rows.map(serializePostForFrontend),
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

  /**
   * Get post by ID
   * GET /api/admin/posts/:id
   */
  getPostById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const post = await Post.findByPk(id, {
        include: [
          {
            model: Admin,
            as: 'author',
            required: false
          }
        ]
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      // Get category info (category_id is string)
      if (post.categoryId) {
        const category = await Category.findByPk(post.categoryId);
        post.dataValues.category = category;
      } else {
        post.dataValues.category = null;
      }
      if (post.thumbnail) {
        post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
      }
      await attachResolvedPostBodyHtml(post);
      if (post.metaImage) {
        post.setDataValue('metaImage', await resolveS3DisplayUrl(post.getDataValue('metaImage')));
      }
      if (post.image) {
        post.setDataValue('image', await resolveS3DisplayUrl(post.getDataValue('image')));
      }

      // Linked event (first PostEvent for this post)
      let eventIdForFrontend = null;
      const postEvent = await PostEvent.findOne({ where: { postId: id } });
      if (postEvent) eventIdForFrontend = postEvent.eventId;

      res.json({
        success: true,
        data: { post: serializePostForFrontend(post, eventIdForFrontend) }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new post
   * POST /api/admin/posts
   */
  createPost: async (req, res, next) => {
    try {
      const {
        title,
        content,
        slug,
        image,
        thumbnail,
        status = 1,
        type = 1,
        categoryId,
        eventId: bodyEventId,
        tag,
        metaTitle,
        metaDescription,
        metaKeywords,
        metaImage,
        metaUrl,
        publishedAt,
        titleEn,
        titleJa,
        titleJp,
        contentEn,
        contentJa,
        contentJp,
        metaTitleEn,
        metaTitleJa,
        metaTitleJp,
        metaDescriptionEn,
        metaDescriptionJa,
        metaDescriptionJp,
        visibilityMask: bodyVisibilityMask
      } = req.body;

      let visibilityMask = normalizePostVisibilityMask(bodyVisibilityMask);
      if (visibilityMask === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chọn ít nhất một nơi hiển thị bài viết'
        });
      }

      const _titleJp = titleJp ?? titleJa;
      const _contentJp = contentJp ?? contentJa;
      const _metaTitleJp = metaTitleJp ?? metaTitleJa;
      const _metaDescriptionJp = metaDescriptionJp ?? metaDescriptionJa;

      const hasTitle = !!(title?.trim() || titleEn?.trim() || _titleJp?.trim());
      const hasContent = !!(content?.trim() || contentEn?.trim() || _contentJp?.trim());
      const hasSlug = !!(slug?.trim());
      if (!hasTitle || !hasContent || !hasSlug) {
        return res.status(400).json({
          success: false,
          message: 'Cần ít nhất một ngôn ngữ cho tiêu đề, nội dung và slug (VI)'
        });
      }
      const mainSlug = (slug && slug.trim()) || '';

      // Check if slug already exists
      const existingPost = await Post.findOne({ where: { slug: mainSlug } });
      if (existingPost) {
        return res.status(409).json({
          success: false,
          message: 'Slug đã tồn tại'
        });
      }

      // Validate category if provided (category_id is string)
      if (categoryId) {
        const category = await Category.findByPk(categoryId.toString());
        if (!category) {
          return res.status(404).json({
            success: false,
            message: 'Danh mục không tồn tại'
          });
        }
      }

      let thumbnailToSave = thumbnail?.trim() || null;
      if (thumbnailToSave) thumbnailToSave = normalizePostMediaFieldToKey(thumbnailToSave);

      const mainContent =
        (content && content.trim()) || contentEn?.trim() || _contentJp?.trim() || '';
      const contentEnTrim = contentEn?.trim() || null;
      const contentJpTrim = _contentJp?.trim() || null;

      const post = await Post.create({
        title: (title && title.trim()) || (titleEn && titleEn.trim()) || (_titleJp && _titleJp.trim()) || mainSlug,
        content: normalizePostHtmlS3ToKeys(mainContent),
        slug: mainSlug,
        image: image ? normalizePostMediaFieldToKey(String(image).trim()) : image,
        thumbnail: thumbnailToSave,
        status,
        type,
        visibilityMask,
        categoryId: categoryId ? categoryId.toString() : null,
        authorId: req.admin.id,
        tag,
        metaTitle,
        metaDescription,
        metaKeywords,
        metaImage: metaImage ? normalizePostMediaFieldToKey(String(metaImage).trim()) : metaImage,
        metaUrl,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        titleEn: titleEn?.trim() || null,
        titleJp: _titleJp?.trim() || null,
        contentEn: contentEnTrim ? normalizePostHtmlS3ToKeys(contentEnTrim) : null,
        contentJp: contentJpTrim ? normalizePostHtmlS3ToKeys(contentJpTrim) : null,
        metaTitleEn: metaTitleEn?.trim() || null,
        metaTitleJp: _metaTitleJp?.trim() || null,
        metaDescriptionEn: metaDescriptionEn?.trim() || null,
        metaDescriptionJp: _metaDescriptionJp?.trim() || null
      });

      // Nếu thumbnail là key temp (posts/temp/thumb_xxx), copy sang folder bài viết posts/{id}/
      if (thumbnailToSave && s3Enabled() && thumbnailToSave.includes('posts/temp/') && thumbnailToSave.includes('thumb_')) {
        try {
          const newKey = await copyPostTempThumbnailToPost(thumbnailToSave, post.id);
          if (newKey) {
            post.thumbnail = newKey;
            await post.save({ fields: ['thumbnail'] });
          }
        } catch (err) {
          // Giữ nguyên temp key nếu copy lỗi
        }
      }

      // Link event if provided
      if (bodyEventId) {
        const eventId = parseInt(bodyEventId, 10);
        if (Number.isInteger(eventId) && eventId > 0) {
          await PostEvent.create({ postId: post.id, eventId });
        }
      }

      // Reload with relations
      await post.reload({
        include: [
          {
            model: Admin,
            as: 'author',
            required: false
          }
        ]
      });

      // Get category info
      if (post.categoryId) {
        const category = await Category.findByPk(post.categoryId);
        post.dataValues.category = category;
      }
      if (post.thumbnail) {
        post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
      }
      await attachResolvedPostBodyHtml(post);
      if (post.metaImage) {
        post.setDataValue('metaImage', await resolveS3DisplayUrl(post.getDataValue('metaImage')));
      }
      if (post.image) {
        post.setDataValue('image', await resolveS3DisplayUrl(post.getDataValue('image')));
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Post',
        action: 'create',
        ip: req.ip || req.connection.remoteAddress,
        after: post.toJSON(),
        description: `Tạo mới bài viết: ${post.title}`
      });

      res.status(201).json({
        success: true,
        message: 'Tạo bài viết thành công',
        data: { post: serializePostForFrontend(post) }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update post
   * PUT /api/admin/posts/:id
   */
  updatePost: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      const oldData = post.toJSON();

      if (updateData.visibilityMask !== undefined) {
        const vm = normalizePostVisibilityMask(updateData.visibilityMask);
        if (vm === 0) {
          return res.status(400).json({
            success: false,
            message: 'Chọn ít nhất một nơi hiển thị bài viết'
          });
        }
        updateData.visibilityMask = vm;
      }

      // Không lưu presigned URL: đổi sang key S3 nếu client gửi URL ảnh từ lần load trước
      if (updateData.thumbnail && (updateData.thumbnail.startsWith('http://') || updateData.thumbnail.startsWith('https://'))) {
        const k = normalizePostMediaFieldToKey(updateData.thumbnail);
        if (k) updateData.thumbnail = k;
        else delete updateData.thumbnail;
      }

      // Map JA → Jp (DB columns are title_jp, content_jp, ...) and drop slug_en/slug_ja
      if (updateData.titleJa !== undefined) {
        updateData.titleJp = updateData.titleJp ?? updateData.titleJa;
        delete updateData.titleJa;
      }
      if (updateData.contentJa !== undefined) {
        updateData.contentJp = updateData.contentJp ?? updateData.contentJa;
        delete updateData.contentJa;
      }
      if (updateData.metaTitleJa !== undefined) {
        updateData.metaTitleJp = updateData.metaTitleJp ?? updateData.metaTitleJa;
        delete updateData.metaTitleJa;
      }
      if (updateData.metaDescriptionJa !== undefined) {
        updateData.metaDescriptionJp = updateData.metaDescriptionJp ?? updateData.metaDescriptionJa;
        delete updateData.metaDescriptionJa;
      }
      delete updateData.slugEn;
      delete updateData.slugJa;

      // Check if new slug already exists (excluding current post)
      if (updateData.slug && updateData.slug !== post.slug) {
        const existingPost = await Post.findOne({
          where: { slug: updateData.slug, id: { [Op.ne]: id } }
        });
        if (existingPost) {
          return res.status(409).json({
            success: false,
            message: 'Slug đã tồn tại'
          });
        }
      }

      // Validate category if being changed (category_id is string)
      if (updateData.categoryId !== undefined && updateData.categoryId !== post.categoryId) {
        if (updateData.categoryId) {
          const category = await Category.findByPk(updateData.categoryId.toString());
          if (!category) {
            return res.status(404).json({
              success: false,
              message: 'Danh mục không tồn tại'
            });
          }
        }
      }

      const eventIdFromBody = updateData.eventId !== undefined ? updateData.eventId : null;
      delete updateData.eventId;

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'categoryId') {
            post[key] = updateData[key] ? updateData[key].toString() : null;
          } else if (key === 'publishedAt' && updateData[key]) {
            post[key] = new Date(updateData[key]);
          } else {
            post[key] = updateData[key];
          }
        }
      });

      const htmlFields = ['content', 'contentEn', 'contentJp'];
      for (const f of htmlFields) {
        if (post[f] != null && typeof post[f] === 'string') {
          post[f] = normalizePostHtmlS3ToKeys(post[f]);
        }
      }
      for (const f of ['metaImage', 'image']) {
        if (post[f] != null && typeof post[f] === 'string') {
          post[f] = normalizePostMediaFieldToKey(post[f]);
        }
      }

      await post.save();

      // Sync post–event link: replace all with single event if provided
      await PostEvent.destroy({ where: { postId: id } });
      if (eventIdFromBody) {
        const eventId = parseInt(eventIdFromBody, 10);
        if (Number.isInteger(eventId) && eventId > 0) {
          await PostEvent.create({ postId: id, eventId });
        }
      }

      // Reload with relations
      await post.reload({
        include: [
          {
            model: Admin,
            as: 'author',
            required: false
          }
        ]
      });

      // Get category info
      if (post.categoryId) {
        const category = await Category.findByPk(post.categoryId);
        post.dataValues.category = category;
      }
      if (post.thumbnail) {
        post.dataValues.thumbnail = await resolvePostThumbnailUrl(post.thumbnail);
      }
      await attachResolvedPostBodyHtml(post);
      if (post.metaImage) {
        post.setDataValue('metaImage', await resolveS3DisplayUrl(post.getDataValue('metaImage')));
      }
      if (post.image) {
        post.setDataValue('image', await resolveS3DisplayUrl(post.getDataValue('image')));
      }

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Post',
        action: 'edit',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: post.toJSON(),
        description: `Cập nhật bài viết: ${post.title}`
      });

      res.json({
        success: true,
        message: 'Cập nhật bài viết thành công',
        data: { post: serializePostForFrontend(post) }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update post status
   * PATCH /api/admin/posts/:id/status
   */
  updateStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái là bắt buộc'
        });
      }

      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      const oldData = post.toJSON();

      post.status = parseInt(status);
      await post.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Post',
        action: 'update_status',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: post.toJSON(),
        description: `Cập nhật trạng thái bài viết: ${post.title} - Status: ${status}`
      });

      res.json({
        success: true,
        message: 'Cập nhật trạng thái bài viết thành công',
        data: { post }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete post (soft delete)
   * DELETE /api/admin/posts/:id
   */
  deletePost: async (req, res, next) => {
    try {
      const { id } = req.params;

      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      const oldData = post.toJSON();

      // Soft delete
      await post.destroy();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Post',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa bài viết: ${post.title}`
      });

      res.json({
        success: true,
        message: 'Xóa bài viết thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload image for post (S3: posts/{id}/{uuid}.ext)
   * POST /api/admin/posts/:id/upload-image
   */
  uploadPostImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }
      const { id } = req.params;
      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
      }

      let url;
      if (s3Enabled()) {
        const key = buildPostImageKey(id, req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        return res.json({ success: true, data: { url, key } });
      }

      const uploadDir = path.join(process.cwd(), config.upload.dir, 'posts', String(id));
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, req.file.buffer);
      url = `/uploads/posts/${id}/${filename}`;
      res.json({ success: true, data: { url, key: url } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload image temp (khi tạo bài viết mới chưa có id). S3: posts/temp/{uuid}.ext
   * POST /api/admin/posts/upload-temp
   */
  uploadPostTempImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }

      let url;
      if (s3Enabled()) {
        const key = buildPostTempImageKey(req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        return res.json({ success: true, data: { url, key } });
      }

      const uploadDir = path.join(process.cwd(), config.upload.dir, 'posts', 'temp');
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, req.file.buffer);
      url = `/uploads/posts/temp/${filename}`;
      res.json({ success: true, data: { url, key: url } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload thumbnail cho bài viết (đã có id). S3: posts/{id}/thumb_{uuid}.ext
   * POST /api/admin/posts/:id/upload-thumbnail
   * Trả về { url, key }: lưu key vào DB, dùng url để preview.
   */
  uploadPostThumbnail: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }
      const { id } = req.params;
      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
      }

      let url;
      let key;
      if (s3Enabled()) {
        key = buildPostThumbnailKey(id, req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        return res.json({ success: true, data: { url, key } });
      }

      const uploadDir = path.join(process.cwd(), config.upload.dir, 'posts', String(id));
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `thumb_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, req.file.buffer);
      url = `/uploads/posts/${id}/${filename}`;
      key = url;
      res.json({ success: true, data: { url, key } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload thumbnail tạm (khi tạo bài viết mới chưa có id). S3: posts/temp/thumb_{uuid}.ext
   * POST /api/admin/posts/upload-thumbnail-temp
   */
  uploadPostTempThumbnail: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
      }

      let url;
      let key;
      if (s3Enabled()) {
        key = buildPostTempThumbnailKey(req.file.originalname);
        await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
        url = await getSignedUrlForFile(key, 'view');
        if (!url) url = key;
        return res.json({ success: true, data: { url, key } });
      }

      const uploadDir = path.join(process.cwd(), config.upload.dir, 'posts', 'temp');
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `thumb_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, req.file.buffer);
      url = `/uploads/posts/temp/${filename}`;
      key = url;
      res.json({ success: true, data: { url, key } });
    } catch (error) {
      next(error);
    }
  }
};

