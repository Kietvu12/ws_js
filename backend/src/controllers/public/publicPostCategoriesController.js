import { Category, Post } from '../../models/index.js';

/**
 * Active categories that have at least one published post (for public blog filters).
 * GET /api/public/post-categories
 */
export async function listPostCategories(req, res, next) {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'slug', 'color', 'sortOrder'],
      include: [
        {
          model: Post,
          as: 'posts',
          where: { status: 2 },
          required: true,
          attributes: []
        }
      ],
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (err) {
    next(err);
  }
}
