import { Campaign, JobCampaign } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

// Helper function to map model field names to database column names
const mapOrderField = (fieldName) => {
  const fieldMap = {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'startDate': 'start_date',
    'endDate': 'end_date'
  };
  return fieldMap[fieldName] || fieldName;
};

/**
 * Campaign Controller (CTV)
 * CTV chỉ có thể xem campaigns đã được publish (status = 1)
 */
export const campaignController = {
  /**
   * Get list of campaigns (CTV)
   * GET /api/ctv/campaigns
   */
  getCampaigns: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status, // Không set default, để có thể lấy tất cả nếu cần
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Chỉ lấy campaigns đang active (status = 1) nếu không có query status
      // Nếu có query status, sử dụng query đó
      if (status !== undefined && status !== null && status !== '') {
        where.status = parseInt(status);
      } else {
        // Mặc định chỉ lấy campaigns đang active (status = 1)
        where.status = 1;
      }
      
      // Debug: Log filter conditions và tổng số campaigns trong DB
      console.log(`[Campaign API] Filter conditions:`, JSON.stringify(where));
      
      // Kiểm tra tổng số campaigns trong DB (không filter)
      const totalInDB = await Campaign.count({ paranoid: true });
      console.log(`[Campaign API] Total campaigns in DB (not deleted): ${totalInDB}`);
      
      // Kiểm tra số campaigns với status = 1
      const totalActive = await Campaign.count({ where: { status: 1 }, paranoid: true });
      console.log(`[Campaign API] Total active campaigns (status=1): ${totalActive}`);

      // Search by name or description
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'createdAt', 'updatedAt', 'startDate', 'endDate', 'name'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'DESC']);
      }

      const { count, rows } = await Campaign.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause,
        paranoid: true // Đảm bảo chỉ lấy campaigns chưa bị xóa
      });

      // Debug: Log số lượng campaigns
      console.log(`[Campaign API] Total campaigns found: ${count}, Returned: ${rows.length}, Page: ${page}, Limit: ${limit}, Offset: ${offset}`);
      console.log(`[Campaign API] Campaign IDs:`, rows.map(c => c.id));

      // Đếm số lượng jobs trong mỗi campaign
      const campaignIds = rows.map(campaign => campaign.id);
      let jobsCountMap = {};
      
      if (campaignIds.length > 0) {
        const [results] = await sequelize.query(
          `SELECT campaign_id, COUNT(*) as count 
           FROM job_campaigns 
           WHERE campaign_id IN (:campaignIds) 
           AND deleted_at IS NULL
           GROUP BY campaign_id`,
          {
            replacements: { campaignIds },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (Array.isArray(results)) {
          results.forEach((item) => {
            jobsCountMap[item.campaign_id] = parseInt(item.count);
          });
        }
      }

      // Attach jobs count to each campaign
      const campaignsWithCount = rows.map(campaign => {
        const campaignData = campaign.toJSON();
        campaignData.jobsCount = jobsCountMap[campaign.id] || 0;
        return campaignData;
      });

      res.json({
        success: true,
        data: {
          campaigns: campaignsWithCount,
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
   * Get campaign by ID (CTV)
   * GET /api/ctv/campaigns/:id
   */
  getCampaignById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({
        where: {
          id,
          status: 1 // Chỉ lấy campaigns đang active
        }
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy campaign hoặc campaign đã bị vô hiệu hóa'
        });
      }

      res.json({
        success: true,
        data: { campaign }
      });
    } catch (error) {
      next(error);
    }
  }
};

