import { SearchHistory } from '../../models/index.js';
import { Op } from 'sequelize';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Search History Management Controller (CTV)
 */
export const searchHistoryController = {
  /**
   * Get list of search history
   * GET /api/ctv/search-history
   */
  getSearchHistory: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await SearchHistory.findAndCountAll({
        where: {
          collaboratorId: req.collaborator.id
        },
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      res.json({
        success: true,
        data: {
          searchHistory: rows,
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
   * Save search history
   * POST /api/ctv/search-history
   */
  saveSearchHistory: async (req, res, next) => {
    try {
      const { keyword, filters, resultCount } = req.body;

      // Validate: phải có keyword hoặc filters
      if (!keyword && !filters) {
        return res.status(400).json({
          success: false,
          message: 'Phải có từ khóa hoặc điều kiện lọc'
        });
      }

      // Validate filters is valid JSON if provided
      let validatedFilters = null;
      if (filters) {
        try {
          // If filters is already an object, stringify it
          if (typeof filters === 'object') {
            validatedFilters = filters;
          } else if (typeof filters === 'string') {
            // Try to parse if it's a string
            validatedFilters = JSON.parse(filters);
          } else {
            return res.status(400).json({
              success: false,
              message: 'Filters phải là object hoặc JSON string hợp lệ'
            });
          }
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: 'Filters không phải là JSON hợp lệ'
          });
        }
      }

      const searchHistory = await SearchHistory.create({
        collaboratorId: req.collaborator.id,
        keyword: keyword || null,
        filters: validatedFilters,
        resultCount: resultCount || 0
      });

      res.status(201).json({
        success: true,
        message: 'Đã lưu lịch sử tìm kiếm',
        data: { searchHistory }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete search history
   * DELETE /api/ctv/search-history/:id
   */
  deleteSearchHistory: async (req, res, next) => {
    try {
      const { id } = req.params;

      const searchHistory = await SearchHistory.findOne({
        where: {
          id: parseInt(id),
          collaboratorId: req.collaborator.id
        }
      });

      if (!searchHistory) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch sử tìm kiếm'
        });
      }

      await searchHistory.destroy();

      res.json({
        success: true,
        message: 'Đã xóa lịch sử tìm kiếm'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Clear all search history
   * DELETE /api/ctv/search-history
   */
  clearSearchHistory: async (req, res, next) => {
    try {
      await SearchHistory.destroy({
        where: {
          collaboratorId: req.collaborator.id
        }
      });

      res.json({
        success: true,
        message: 'Đã xóa tất cả lịch sử tìm kiếm'
      });
    } catch (error) {
      next(error);
    }
  }
};

