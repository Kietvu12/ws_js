import { JobPickup, JobPickupId, Job } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Job Pickup Controller (CTV)
 * CTV có thể xem danh sách job pickups
 */
export const jobPickupController = {
  /**
   * Get list of job pickups (CTV)
   * GET /api/ctv/job-pickups
   */
  getJobPickups: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name
      if (search) {
        where.name = { [Op.like]: `%${search}%` };
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'name'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await JobPickup.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause
      });

      // Đếm số lượng jobs trong mỗi pickup
      const pickupIds = rows.map(pickup => pickup.id);
      let jobsCountMap = {};
      
      if (pickupIds.length > 0) {
        const [results] = await sequelize.query(
          `SELECT id_job_pickups, COUNT(*) as count 
           FROM job_pickups_id 
           WHERE id_job_pickups IN (:pickupIds) 
           AND deleted_at IS NULL
           GROUP BY id_job_pickups`,
          {
            replacements: { pickupIds },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (Array.isArray(results)) {
          results.forEach((item) => {
            jobsCountMap[item.id_job_pickups] = parseInt(item.count);
          });
        }
      }

      // Attach jobs count to each pickup
      const pickupsWithCount = rows.map(pickup => {
        const pickupData = pickup.toJSON();
        pickupData.jobsCount = jobsCountMap[pickup.id] || 0;
        return pickupData;
      });

      res.json({
        success: true,
        data: {
          pickups: pickupsWithCount,
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
   * Get job pickup by ID (CTV)
   * GET /api/ctv/job-pickups/:id
   */
  getJobPickupById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const pickup = await JobPickup.findByPk(id);

      if (!pickup) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy job pickup'
        });
      }

      // Đếm số lượng jobs trong pickup
      const jobsCount = await JobPickupId.count({
        where: { jobPickupId: id }
      });

      const pickupData = pickup.toJSON();
      pickupData.jobsCount = jobsCount;

      res.json({
        success: true,
        data: { pickup: pickupData }
      });
    } catch (error) {
      next(error);
    }
  }
};

