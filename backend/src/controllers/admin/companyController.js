import { Company, CompanyBusinessField, CompanyEmailAddress, CompanyOffice, Job, ActionLog } from '../../models/index.js';
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
 * Company Management Controller (Admin)
 */
export const companyController = {
  /**
   * Get list of companies
   * GET /api/admin/companies
   */
  getCompanies: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        type,
        sortBy = 'id',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search by name, company_code, email, or phone
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { companyCode: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by status
      if (status !== undefined) {
        where.status = status === 'true' || status === '1' || status === 1;
      }

      // Filter by type
      if (type) {
        where.type = type;
      }

      // Validate sortBy
      const allowedSortFields = ['id', 'name', 'companyCode', 'createdAt', 'updatedAt'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const dbSortField = mapOrderField(sortField);

      // Build order clause
      const orderClause = [[dbSortField, orderDirection]];
      if (sortField !== 'id') {
        orderClause.push(['id', 'ASC']);
      }

      const includeEmailAddresses = req.query.include === 'emailAddresses';
      const findOptions = {
        where,
        limit: parseInt(limit),
        offset,
        order: orderClause
      };
      if (includeEmailAddresses) {
        findOptions.include = [{
          model: CompanyEmailAddress,
          as: 'emailAddresses',
          required: false,
          attributes: ['id', 'companyId', 'email']
        }];
      }

      const { count, rows } = await Company.findAndCountAll(findOptions);

      // Get jobs count for each company
      const companyIds = rows.map(c => c.id);
      if (companyIds.length > 0) {
        const jobsCounts = await sequelize.query(
          `SELECT company_id, COUNT(*) as count 
           FROM jobs 
           WHERE company_id IN (${companyIds.join(',')})
           AND deleted_at IS NULL
           GROUP BY company_id`,
          { type: sequelize.QueryTypes.SELECT }
        );

        const countMap = {};
        jobsCounts.forEach(item => {
          countMap[item.company_id] = parseInt(item.count);
        });

        rows.forEach(company => {
          company.dataValues.jobsCount = countMap[company.id] || 0;
        });
      } else {
        rows.forEach(company => {
          company.dataValues.jobsCount = 0;
        });
      }

      res.json({
        success: true,
        data: {
          companies: rows,
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
   * Get company by ID
   * GET /api/admin/companies/:id
   */
  getCompanyById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const company = await Company.findByPk(id, {
        include: [
          {
            model: CompanyBusinessField,
            as: 'businessFields',
            required: false
          },
          {
            model: CompanyEmailAddress,
            as: 'emailAddresses',
            required: false
          },
          {
            model: CompanyOffice,
            as: 'offices',
            required: false
          },
          {
            model: Job,
            as: 'jobs',
            required: false,
            attributes: ['id', 'title', 'jobCode', 'status'],
            limit: 10
          }
        ]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy công ty'
        });
      }

      res.json({
        success: true,
        data: { company }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new company
   * POST /api/admin/companies
   */
  createCompany: async (req, res, next) => {
    try {
      const {
        name,
        logo,
        companyCode,
        type,
        address,
        phone,
        email,
        website,
        description,
        status = true,
        businessFields = [],
        emailAddresses = [],
        offices = []
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Tên công ty là bắt buộc'
        });
      }

      // Check if company_code already exists (if provided)
      if (companyCode) {
        const existingCompany = await Company.findOne({ where: { companyCode } });
        if (existingCompany) {
          return res.status(409).json({
            success: false,
            message: 'Mã công ty đã tồn tại'
          });
        }
      }

      // Create company with transaction
      const transaction = await sequelize.transaction();

      try {
        const company = await Company.create({
          name,
          logo,
          companyCode,
          type,
          address,
          phone,
          email,
          website,
          description,
          status
        }, { transaction });

        // Create business fields
        if (businessFields && businessFields.length > 0) {
          await CompanyBusinessField.bulkCreate(
            businessFields.map(field => ({
              companyId: company.id,
              content: field.content || field
            })),
            { transaction }
          );
        }

        // Create email addresses
        if (emailAddresses && emailAddresses.length > 0) {
          await CompanyEmailAddress.bulkCreate(
            emailAddresses.map(emailAddr => ({
              companyId: company.id,
              email: emailAddr.email || emailAddr
            })),
            { transaction }
          );
        }

        // Create offices
        if (offices && offices.length > 0) {
          await CompanyOffice.bulkCreate(
            offices.map(office => ({
              companyId: company.id,
              address: office.address,
              isHeadOffice: office.isHeadOffice || false
            })),
            { transaction }
          );
        }

        await transaction.commit();

        // Reload with relations
        await company.reload({
          include: [
            {
              model: CompanyBusinessField,
              as: 'businessFields',
              required: false
            },
            {
              model: CompanyEmailAddress,
              as: 'emailAddresses',
              required: false
            },
            {
              model: CompanyOffice,
              as: 'offices',
              required: false
            }
          ]
        });

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Company',
          action: 'create',
          ip: req.ip || req.connection.remoteAddress,
          after: company.toJSON(),
          description: `Tạo mới công ty: ${company.name}`
        });

        res.status(201).json({
          success: true,
          message: 'Tạo công ty thành công',
          data: { company }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update company
   * PUT /api/admin/companies/:id
   */
  updateCompany: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        logo,
        companyCode,
        type,
        address,
        phone,
        email,
        website,
        description,
        status,
        businessFields,
        emailAddresses,
        offices
      } = req.body;

      const company = await Company.findByPk(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy công ty'
        });
      }

      // Store old data for log
      const oldData = company.toJSON();

      // Update basic fields
      if (name !== undefined) company.name = name;
      if (logo !== undefined) company.logo = logo;
      if (companyCode !== undefined) {
        // Check if company_code is already taken by another company
        const existingCompany = await Company.findOne({
          where: { companyCode, id: { [Op.ne]: id } }
        });
        if (existingCompany) {
          return res.status(409).json({
            success: false,
            message: 'Mã công ty đã tồn tại'
          });
        }
        company.companyCode = companyCode;
      }
      if (type !== undefined) company.type = type;
      if (address !== undefined) company.address = address;
      if (phone !== undefined) company.phone = phone;
      if (email !== undefined) company.email = email;
      if (website !== undefined) company.website = website;
      if (description !== undefined) company.description = description;
      if (status !== undefined) company.status = status;

      // Use transaction for related data
      const transaction = await sequelize.transaction();

      try {
        await company.save({ transaction });

        // Update business fields if provided
        if (businessFields !== undefined) {
          // Delete existing
          await CompanyBusinessField.destroy({
            where: { companyId: company.id },
            transaction
          });
          // Create new
          if (businessFields.length > 0) {
            await CompanyBusinessField.bulkCreate(
              businessFields.map(field => ({
                companyId: company.id,
                content: field.content || field
              })),
              { transaction }
            );
          }
        }

        // Update email addresses if provided
        if (emailAddresses !== undefined) {
          // Delete existing
          await CompanyEmailAddress.destroy({
            where: { companyId: company.id },
            transaction
          });
          // Create new
          if (emailAddresses.length > 0) {
            await CompanyEmailAddress.bulkCreate(
              emailAddresses.map(emailAddr => ({
                companyId: company.id,
                email: emailAddr.email || emailAddr
              })),
              { transaction }
            );
          }
        }

        // Update offices if provided
        if (offices !== undefined) {
          // Delete existing
          await CompanyOffice.destroy({
            where: { companyId: company.id },
            transaction
          });
          // Create new
          if (offices.length > 0) {
            await CompanyOffice.bulkCreate(
              offices.map(office => ({
                companyId: company.id,
                address: office.address,
                isHeadOffice: office.isHeadOffice || false
              })),
              { transaction }
            );
          }
        }

        await transaction.commit();

        // Reload with relations
        await company.reload({
          include: [
            {
              model: CompanyBusinessField,
              as: 'businessFields',
              required: false
            },
            {
              model: CompanyEmailAddress,
              as: 'emailAddresses',
              required: false
            },
            {
              model: CompanyOffice,
              as: 'offices',
              required: false
            }
          ]
        });

        // Log action
        await ActionLog.create({
          adminId: req.admin.id,
          object: 'Company',
          action: 'edit',
          ip: req.ip || req.connection.remoteAddress,
          before: oldData,
          after: company.toJSON(),
          description: `Cập nhật công ty: ${company.name}`
        });

        res.json({
          success: true,
          message: 'Cập nhật công ty thành công',
          data: { company }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete company (hard delete - no soft delete for companies)
   * DELETE /api/admin/companies/:id
   */
  deleteCompany: async (req, res, next) => {
    try {
      const { id } = req.params;

      const company = await Company.findByPk(id, {
        include: [
          {
            model: Job,
            as: 'jobs',
            required: false
          }
        ]
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy công ty'
        });
      }

      // Check if company has jobs
      if (company.jobs && company.jobs.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa công ty có việc làm. Vui lòng xóa hoặc chuyển việc làm trước.'
        });
      }

      // Store old data for log
      const oldData = company.toJSON();

      // Hard delete (companies table doesn't have deleted_at)
      await company.destroy({ force: true });

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Company',
        action: 'delete',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        description: `Xóa công ty: ${company.name}`
      });

      res.json({
        success: true,
        message: 'Xóa công ty thành công'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle company status
   * PATCH /api/admin/companies/:id/toggle-status
   */
  toggleStatus: async (req, res, next) => {
    try {
      const { id } = req.params;

      const company = await Company.findByPk(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy công ty'
        });
      }

      const oldData = company.toJSON();

      // Toggle status
      company.status = !company.status;
      await company.save();

      // Log action
      await ActionLog.create({
        adminId: req.admin.id,
        object: 'Company',
        action: company.status ? 'activate' : 'deactivate',
        ip: req.ip || req.connection.remoteAddress,
        before: oldData,
        after: company.toJSON(),
        description: `${company.status ? 'Kích hoạt' : 'Vô hiệu hóa'} công ty: ${company.name}`
      });

      res.json({
        success: true,
        message: `${company.status ? 'Kích hoạt' : 'Vô hiệu hóa'} công ty thành công`,
        data: { company }
      });
    } catch (error) {
      next(error);
    }
  }
};

