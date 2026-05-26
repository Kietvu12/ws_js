-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: database-staging2.cxcwgo20sgk4.ap-southeast-1.rds.amazonaws.com    Database: job_share_prod
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `action_logs`
--

DROP TABLE IF EXISTS `action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `action_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned DEFAULT NULL COMMENT 'Admin thß╗▒c hiß╗çn action',
  `object` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'T├¬n object/model ─æã░ß╗úc thao t├íc (Job, JobApplication, CVStorage, etc.)',
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'H├ánh ─æß╗Öng: login, logout, create, edit, delete, import',
  `ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address cß╗ºa admin',
  `before` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Dß╗» liß╗çu trã░ß╗øc khi thay ─æß╗òi',
  `after` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Dß╗» liß╗çu sau khi thay ─æß╗òi',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'M├┤ tß║ú chi tiß║┐t action',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_action_logs_admin` (`admin_id`),
  CONSTRAINT `fk_action_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `action_logs_chk_1` CHECK (json_valid(`before`)),
  CONSTRAINT `action_logs_chk_2` CHECK (json_valid(`after`))
) ENGINE=InnoDB AUTO_INCREMENT=6615 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1: active, 0: inactive',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `role` tinyint NOT NULL DEFAULT '1' COMMENT '1: Super Admin, 2: Admin Backoffice, 3: Admin CA Team',
  `group_id` bigint unsigned DEFAULT NULL COMMENT 'ID nh├│m cho Admin CA Team',
  PRIMARY KEY (`id`),
  KEY `fk_admins_group` (`group_id`),
  CONSTRAINT `fk_admins_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `applicants`
--

DROP TABLE IF EXISTS `applicants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applicants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_applicants_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `benefits`
--

DROP TABLE IF EXISTS `benefits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `benefits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_benefits_job` (`job_id`),
  CONSTRAINT `fk_benefits_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9384 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendars`
--

DROP TABLE IF EXISTS `calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_application_id` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa job_application li├¬n quan lß╗ïch hß║╣n',
  `admin_id` bigint unsigned DEFAULT NULL COMMENT 'Admin phß╗Ñ tr├ích lß╗ïch hß║╣n',
  `collaborator_id` bigint unsigned DEFAULT NULL COMMENT 'CTV li├¬n quan lß╗ïch hß║╣n',
  `event_type` tinyint NOT NULL DEFAULT '1' COMMENT '1: Interview, 2: Nyusha, 3: Kh├íc',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ti├¬u ─æß╗ü lß╗ïch hß║╣n',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi ch├║ chi tiß║┐t cho lß╗ïch hß║╣n',
  `start_at` datetime NOT NULL COMMENT 'Thß╗Øi gian bß║»t ─æß║ºu',
  `end_at` datetime DEFAULT NULL COMMENT 'Thß╗Øi gian kß║┐t th├║c (nß║┐u c├│)',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0: Pending, 1: Confirmed, 2: Cancelled',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_calendars_job_application` (`job_application_id`),
  KEY `fk_calendars_admin` (`admin_id`),
  KEY `fk_calendars_collaborator` (`collaborator_id`),
  CONSTRAINT `fk_calendars_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_calendars_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_calendars_job_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_applications`
--

DROP TABLE IF EXISTS `campaign_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint unsigned NOT NULL,
  `collaborator_id` bigint unsigned NOT NULL,
  `job_id` bigint unsigned NOT NULL,
  `cover_letter` text COLLATE utf8mb4_unicode_ci,
  `cv_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0: requested, 1: approved, 2: rejected',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `applied_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `cover_letter_en` text COLLATE utf8mb4_unicode_ci,
  `notes_en` text COLLATE utf8mb4_unicode_ci,
  `cover_letter_jp` text COLLATE utf8mb4_unicode_ci,
  `notes_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_campaign_applications_campaign` (`campaign_id`),
  KEY `fk_campaign_applications_collaborator` (`collaborator_id`),
  KEY `fk_campaign_applications_job` (`job_id`),
  CONSTRAINT `fk_campaign_applications_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_campaign_applications_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_campaign_applications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `max_cv` int DEFAULT '0',
  `percent` int DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0: inactive, 1: active, 2: ended',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `cover_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Đường dẫn ảnh cover — S3 key hoặc URL/path',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#007bff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `show_in_dashboard` tinyint(1) NOT NULL DEFAULT '0',
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `color_en` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `color_jp` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborator_assignments`
--

DROP TABLE IF EXISTS `collaborator_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborator_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cv_storage_id` bigint unsigned NOT NULL COMMENT 'ID hồ sơ ứng viên (cv_storages) được giao cho AdminBackOffice phụ trách',
  `admin_id` bigint unsigned NOT NULL COMMENT 'ID AdminBackOffice được phân công chăm sóc',
  `assigned_by` bigint unsigned NOT NULL COMMENT 'ID Super Admin thực hiện phân công',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú về phân công',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1: active, 0: inactive',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `notes_en` text COLLATE utf8mb4_unicode_ci,
  `notes_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_assignment` (`cv_storage_id`,`admin_id`,`status`,`deleted_at`),
  KEY `fk_collaborator_assignments_admin` (`admin_id`),
  KEY `fk_collaborator_assignments_assigned_by` (`assigned_by`),
  KEY `fk_collaborator_assignments_cv_storage` (`cv_storage_id`),
  CONSTRAINT `fk_collaborator_assignments_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_collaborator_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_collaborator_assignments_cv_storage` FOREIGN KEY (`cv_storage_id`) REFERENCES `cv_storages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=231 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborator_notifications`
--

DROP TABLE IF EXISTS `collaborator_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborator_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned DEFAULT NULL,
  `admin_id` bigint unsigned DEFAULT NULL COMMENT 'Admin nhận thông báo (khi không gửi CTV)',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_id` bigint unsigned DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `url_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `url_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_collaborator_notifications_collaborator` (`collaborator_id`),
  KEY `fk_collaborator_notifications_job` (`job_id`),
  KEY `idx_collaborator_notifications_admin_id` (`admin_id`),
  CONSTRAINT `fk_collaborator_notifications_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_collaborator_notifications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2589 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborator_saved_list_jobs`
--

DROP TABLE IF EXISTS `collaborator_saved_list_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborator_saved_list_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `saved_list_id` bigint unsigned NOT NULL COMMENT 'Playlist chứa job',
  `job_id` bigint unsigned NOT NULL COMMENT 'Job được lưu',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT 'Thứ tự hiển thị trong list',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_saved_list_job` (`saved_list_id`,`job_id`),
  KEY `fk_collab_saved_list_jobs_list` (`saved_list_id`),
  KEY `fk_collab_saved_list_jobs_job` (`job_id`),
  CONSTRAINT `fk_collab_saved_list_jobs_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_collab_saved_list_jobs_list` FOREIGN KEY (`saved_list_id`) REFERENCES `collaborator_saved_lists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborator_saved_lists`
--

DROP TABLE IF EXISTS `collaborator_saved_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborator_saved_lists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned NOT NULL COMMENT 'CTV sở hữu danh sách',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên playlist (VD: Việc làm IT yêu thích)',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_collab_saved_lists_collaborator` (`collaborator_id`),
  CONSTRAINT `fk_collab_saved_lists_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborator_saved_search_criteria`
--

DROP TABLE IF EXISTS `collaborator_saved_search_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborator_saved_search_criteria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned NOT NULL COMMENT 'CTV sở hữu tiêu chí',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên gợi nhớ (VD: Tìm kiếm IT Tokyo)',
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'JSON: keyword, locations[], fieldIds[], jobTypeIds[], age, salaryMin, salaryMax, employmentType, highlights[], booleans',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `filters_en` longtext COLLATE utf8mb4_unicode_ci,
  `filters_jp` longtext COLLATE utf8mb4_unicode_ci,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_collab_saved_criteria_collaborator` (`collaborator_id`),
  CONSTRAINT `fk_collab_saved_criteria_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collaborators`
--

DROP TABLE IF EXISTS `collaborators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborators` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_verification_token_hash` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_expires_at` datetime DEFAULT NULL,
  `email_verification_sent_at` datetime DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `organization_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'individual',
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_address` text COLLATE utf8mb4_unicode_ci,
  `business_license` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `gender` tinyint DEFAULT NULL COMMENT '1: male, 2: female, 3: other',
  `facebook` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zalo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `points` int NOT NULL DEFAULT '0',
  `rank_level_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1: active, 0: inactive',
  `approved_at` timestamp NULL DEFAULT NULL,
  `group_id` bigint unsigned DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_token_hash_jp` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_jp` text COLLATE utf8mb4_unicode_ci,
  `organization_type_jp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_address_jp` text COLLATE utf8mb4_unicode_ci,
  `business_license_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zalo_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_link_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_token_hash_en` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_en` text COLLATE utf8mb4_unicode_ci,
  `organization_type_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_address_en` text COLLATE utf8mb4_unicode_ci,
  `business_license_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zalo_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organization_link_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_collaborators_rank_level` (`rank_level_id`),
  CONSTRAINT `fk_collaborators_rank_level` FOREIGN KEY (`rank_level_id`) REFERENCES `rank_levels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=540 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


ALTER TABLE companies
  ADD COLUMN password VARCHAR(255) NULL,
  ADD COLUMN remember_token VARCHAR(100) NULL,
  ADD UNIQUE KEY uk_companies_email (email);

--
-- Table structure for table `company_business_fields`
--

DROP TABLE IF EXISTS `company_business_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_business_fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_company` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa company',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nß╗Öi dung l─®nh vß╗▒c kinh doanh',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_company_business_fields_company` (`id_company`),
  CONSTRAINT `fk_company_business_fields_company` FOREIGN KEY (`id_company`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `company_email_addresses`
--

DROP TABLE IF EXISTS `company_email_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_email_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_company_email_addresses_company` (`company_id`),
  CONSTRAINT `fk_company_email_addresses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `company_offices`
--

DROP TABLE IF EXISTS `company_offices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_offices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_company` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa company',
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '─Éß╗ïa chß╗ë v─ân ph├▓ng',
  `is_head_office` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1: V─ân ph├▓ng ch├¡nh, 0: V─ân ph├▓ng chi nh├ính',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `address_en` text COLLATE utf8mb4_unicode_ci,
  `address_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_company_offices_company` (`id_company`),
  CONSTRAINT `fk_company_offices_company` FOREIGN KEY (`id_company`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cv_storages`
--

DROP TABLE IF EXISTS `cv_storages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cv_storages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned DEFAULT NULL COMMENT 'ID cß╗ºa collaborator tß║ío CV (nß║┐u c├│)',
  `applicant_id` bigint unsigned DEFAULT NULL,
  `admin_id` bigint unsigned DEFAULT NULL COMMENT 'ID cß╗ºa admin tß║ío CV (nß║┐u c├│)',
  `job_category_id` bigint unsigned DEFAULT NULL COMMENT 'FK job_categories — loại/chi tiết công việc mong muốn',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `furigana` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` tinyint DEFAULT NULL,
  `ages` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_origin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passport` tinyint DEFAULT NULL,
  `current_residence` tinyint DEFAULT NULL,
  `jp_residence_status` tinyint DEFAULT NULL,
  `visa_expiration_date` date DEFAULT NULL,
  `other_country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_current` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'M├ú bã░u ─æiß╗çn',
  `spouse` tinyint DEFAULT NULL,
  `current_income` int DEFAULT NULL,
  `desired_income` int DEFAULT NULL,
  `desired_work_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desired_position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vß╗ï tr├¡ mong muß╗æn',
  `nyusha_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interview_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `learned_tools` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `experience_tools` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `jlpt_level` tinyint DEFAULT NULL,
  `experience_years` tinyint DEFAULT NULL,
  `specialization` tinyint DEFAULT NULL,
  `qualification` tinyint DEFAULT NULL,
  `educations` json DEFAULT NULL,
  `work_experiences` json DEFAULT NULL,
  `technical_skills` text COLLATE utf8mb4_unicode_ci COMMENT 'Kß╗╣ n─âng kß╗╣ thuß║¡t',
  `certificates` json DEFAULT NULL,
  `career_summary` text COLLATE utf8mb4_unicode_ci COMMENT 'T├│m tß║»t nghß╗ü nghiß╗çp',
  `strengths` text COLLATE utf8mb4_unicode_ci COMMENT '─Éiß╗âm mß║ính',
  `motivation` text COLLATE utf8mb4_unicode_ci COMMENT '─Éß╗Öng lß╗▒c ß╗®ng tuyß╗ân',
  `other_documents` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curriculum_vitae` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_original_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'S3/local path: CV gốc (file upload)',
  `cv_career_history_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'S3/local path: CV 職務経歴書 (tab 2)',
  `avatar_photo_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Đường dẫn ảnh hồ sơ (profile photo) trong snapshot — S3 key hoặc path tương đối',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1',
  `is_duplicate` tinyint(1) DEFAULT '0' COMMENT 'Trß║íng th├íi tr├╣ng lß║Àp: 0 = kh├┤ng tr├╣ng, 1 = tr├╣ng',
  `duplicate_with_cv_id` bigint unsigned DEFAULT NULL COMMENT 'ID cß╗ºa CV tr├╣ng lß║Àp',
  `is_parse` tinyint(1) NOT NULL DEFAULT '0',
  `last_time_parsed` tinyint(1) NOT NULL DEFAULT '0',
  `completion_state` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ready_for_parse',
  `vector_sync_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `vector_sync_requested_at` datetime DEFAULT NULL,
  `vector_sync_completed_at` datetime DEFAULT NULL,
  `vector_sync_last_error` text COLLATE utf8mb4_unicode_ci,
  `vector_sync_retry_count` int unsigned NOT NULL DEFAULT '0',
  `cv_table_layout` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Map layout bảng CV (JSON)',
  `admin_note` bigint unsigned DEFAULT NULL COMMENT 'Metadata số (vd. thời điểm gửi yêu cầu, ms unix)',
  `admin_supplement_marks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Mảng đánh dấu: fieldKey, start, end, id...',
  `last_time_parse` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `furigana_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ages_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_origin_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_country_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_current_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desired_work_location_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desired_position_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nyusha_time_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interview_time_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `learned_tools_jp` longtext COLLATE utf8mb4_unicode_ci,
  `experience_tools_jp` longtext COLLATE utf8mb4_unicode_ci,
  `educations_jp` longtext COLLATE utf8mb4_unicode_ci,
  `work_experiences_jp` longtext COLLATE utf8mb4_unicode_ci,
  `technical_skills_jp` text COLLATE utf8mb4_unicode_ci,
  `certificates_jp` longtext COLLATE utf8mb4_unicode_ci,
  `career_summary_jp` text COLLATE utf8mb4_unicode_ci,
  `strengths_jp` text COLLATE utf8mb4_unicode_ci,
  `motivation_jp` text COLLATE utf8mb4_unicode_ci,
  `other_documents_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curriculum_vitae_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes_jp` text COLLATE utf8mb4_unicode_ci,
  `cv_table_layout_jp` longtext COLLATE utf8mb4_unicode_ci,
  `admin_supplement_marks_jp` longtext COLLATE utf8mb4_unicode_ci,
  `furigana_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ages_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_origin_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_country_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_current_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desired_work_location_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desired_position_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nyusha_time_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interview_time_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `learned_tools_en` longtext COLLATE utf8mb4_unicode_ci,
  `experience_tools_en` longtext COLLATE utf8mb4_unicode_ci,
  `educations_en` longtext COLLATE utf8mb4_unicode_ci,
  `work_experiences_en` longtext COLLATE utf8mb4_unicode_ci,
  `technical_skills_en` json DEFAULT NULL,
  `certificates_en` longtext COLLATE utf8mb4_unicode_ci,
  `career_summary_en` text COLLATE utf8mb4_unicode_ci,
  `strengths_en` text COLLATE utf8mb4_unicode_ci,
  `motivation_en` text COLLATE utf8mb4_unicode_ci,
  `other_documents_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `curriculum_vitae_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes_en` text COLLATE utf8mb4_unicode_ci,
  `cv_table_layout_en` longtext COLLATE utf8mb4_unicode_ci,
  `admin_supplement_marks_en` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cv_storages_code` (`code`),
  KEY `fk_cv_storages_collaborator` (`collaborator_id`),
  KEY `fk_cv_storages_admin` (`admin_id`),
  KEY `fk_cv_storages_duplicate` (`duplicate_with_cv_id`),
  KEY `fk_cv_storages_applicant` (`applicant_id`),
  KEY `idx_cv_storages_job_category_id` (`job_category_id`),
  CONSTRAINT `fk_cv_storages_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cv_storages_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cv_storages_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cv_storages_duplicate` FOREIGN KEY (`duplicate_with_cv_id`) REFERENCES `cv_storages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cv_storages_job_category_id` FOREIGN KEY (`job_category_id`) REFERENCES `job_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cv_storages_chk_1` CHECK (json_valid(`learned_tools`)),
  CONSTRAINT `cv_storages_chk_2` CHECK (json_valid(`experience_tools`)),
  CONSTRAINT `cv_storages_chk_3` CHECK (json_valid(`educations`)),
  CONSTRAINT `cv_storages_chk_4` CHECK (json_valid(`work_experiences`)),
  CONSTRAINT `cv_storages_chk_5` CHECK (json_valid(`certificates`)),
  CONSTRAINT `cv_storages_chk_6` CHECK (json_valid(`cv_table_layout`)),
  CONSTRAINT `cv_storages_chk_7` CHECK (json_valid(`admin_supplement_marks`))
) ENGINE=InnoDB AUTO_INCREMENT=5301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_newsletters`
--

DROP TABLE IF EXISTS `email_newsletters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_newsletters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `sent_at` timestamp NULL DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipients_count` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `type` tinyint NOT NULL DEFAULT '1',
  `group_id` bigint unsigned DEFAULT NULL,
  `file_attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `subject_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `notes_en` text COLLATE utf8mb4_unicode_ci,
  `file_attachment_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `notes_jp` text COLLATE utf8mb4_unicode_ci,
  `file_attachment_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_newsletters_created_by` (`created_by`),
  KEY `fk_email_newsletters_group` (`group_id`),
  CONSTRAINT `fk_email_newsletters_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_email_newsletters_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `email_newsletters_chk_1` CHECK (json_valid(`recipients`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` tinyint NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `subject_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `subject_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_templates_created_by` (`created_by`),
  CONSTRAINT `fk_email_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_to_collaborator`
--

DROP TABLE IF EXISTS `email_to_collaborator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_to_collaborator` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa collaborator',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipients_detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipient_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'specific',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `recipients_count` int NOT NULL DEFAULT '0',
  `file_attachment_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `subject_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_en` longtext COLLATE utf8mb4_unicode_ci,
  `status_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `subject_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_jp` longtext COLLATE utf8mb4_unicode_ci,
  `status_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_to_collaborator_collaborator` (`collaborator_id`),
  KEY `fk_email_to_collaborator_created_by` (`created_by`),
  CONSTRAINT `fk_email_to_collaborator_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_email_to_collaborator_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `email_to_collaborator_chk_1` CHECK (json_valid(`recipients`)),
  CONSTRAINT `email_to_collaborator_chk_2` CHECK (json_valid(`recipients_detail`)),
  CONSTRAINT `email_to_collaborator_chk_3` CHECK (json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_to_companies`
--

DROP TABLE IF EXISTS `email_to_companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_to_companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email_company_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipients_detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipient_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'specific',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `recipients_count` int NOT NULL DEFAULT '0',
  `file_attachment_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `subject_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_en` longtext COLLATE utf8mb4_unicode_ci,
  `status_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `subject_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_jp` longtext COLLATE utf8mb4_unicode_ci,
  `status_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_to_companies_email_company` (`email_company_id`),
  KEY `fk_email_to_companies_created_by` (`created_by`),
  CONSTRAINT `fk_email_to_companies_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `email_to_companies_chk_1` CHECK (json_valid(`recipients`)),
  CONSTRAINT `email_to_companies_chk_2` CHECK (json_valid(`recipients_detail`)),
  CONSTRAINT `email_to_companies_chk_3` CHECK (json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_to_group`
--

DROP TABLE IF EXISTS `email_to_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_to_group` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa group',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipients_detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recipient_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'specific',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `sent_at` timestamp NULL DEFAULT NULL,
  `recipients_count` int NOT NULL DEFAULT '0',
  `file_attachment_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `subject_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_en` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_en` longtext COLLATE utf8mb4_unicode_ci,
  `status_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `subject_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipients_detail_jp` longtext COLLATE utf8mb4_unicode_ci,
  `recipient_type_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachments_jp` longtext COLLATE utf8mb4_unicode_ci,
  `status_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_attachment_original_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_to_group_group` (`group_id`),
  KEY `fk_email_to_group_created_by` (`created_by`),
  CONSTRAINT `fk_email_to_group_created_by` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_email_to_group_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `email_to_group_chk_1` CHECK (json_valid(`recipients`)),
  CONSTRAINT `email_to_group_chk_2` CHECK (json_valid(`recipients_detail`)),
  CONSTRAINT `email_to_group_chk_3` CHECK (json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_participants`
--

DROP TABLE IF EXISTS `event_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `collaborator_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email khi tham gia bên ngoài (external)',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tên khi tham gia bên ngoài (external)',
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1: nội bộ (admin/CTV), 0: bên ngoài',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_participants_event_id` (`event_id`),
  KEY `idx_event_participants_admin_id` (`admin_id`),
  KEY `idx_event_participants_collaborator_id` (`collaborator_id`),
  KEY `idx_event_participants_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_event_participants_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_at` datetime NOT NULL,
  `end_at` datetime DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1: active, 0: cancelled',
  `created_by` bigint unsigned DEFAULT NULL COMMENT 'admin_id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `location_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `location_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_events_start_at` (`start_at`),
  KEY `idx_events_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faqs`
--

DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faqs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `question` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `order` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1: active, 0: inactive',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `question_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answer_en` text COLLATE utf8mb4_unicode_ci,
  `question_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answer_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referral_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `home_setting_company_infos`
--

DROP TABLE IF EXISTS `home_setting_company_infos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_setting_company_infos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `establishment_date` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `representative_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `main_business` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `establishment_date_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_address_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `representative_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `main_business_en` text COLLATE utf8mb4_unicode_ci,
  `company_email_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `establishment_date_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_address_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `representative_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `main_business_jp` text COLLATE utf8mb4_unicode_ci,
  `company_email_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `home_setting_jobs`
--

DROP TABLE IF EXISTS `home_setting_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_setting_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int NOT NULL DEFAULT '1',
  `thumbnail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `requirement` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary` int DEFAULT NULL,
  `salary_unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '1: active, 0: inactive',
  `popup` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_en` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `requirement_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary_unit_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `popup_en` text COLLATE utf8mb4_unicode_ci,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_jp` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `requirement_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary_unit_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `popup_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_home_setting_jobs_post` (`post_id`),
  CONSTRAINT `fk_home_setting_jobs_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `home_setting_partners`
--

DROP TABLE IF EXISTS `home_setting_partners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_setting_partners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '1: active, 0: inactive',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `url_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_application_memos`
--

DROP TABLE IF EXISTS `job_application_memos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_application_memos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_application_id` bigint unsigned NOT NULL,
  `job_id` bigint unsigned DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `note_jp` text COLLATE utf8mb4_unicode_ci,
  `note_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_job_application_memos_job_application_id` (`job_application_id`),
  KEY `idx_job_application_memos_job_id` (`job_id`),
  KEY `fk_memos_admin` (`created_by`),
  CONSTRAINT `fk_memos_admin` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`),
  CONSTRAINT `fk_memos_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_memos_job_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_applications`
--

DROP TABLE IF EXISTS `job_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `collaborator_id` bigint unsigned DEFAULT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `applicant_id` bigint unsigned DEFAULT NULL COMMENT 'Ứng viên (landing) tạo đơn',
  `admin_responsible_id` bigint unsigned DEFAULT NULL,
  `title` text COLLATE utf8mb4_unicode_ci COMMENT 'Ti├¬u ─æß╗ü',
  `status` int DEFAULT NULL COMMENT 'Trß║íng th├íi : 1. Admin ─æang xß╗¡ l├¢ hß╗ô sãí, 2. ─Éang tiß║┐n cß╗¡, 3. ─Éang xß║┐p lß╗ïch phß╗Ång vß║Ñn, 4. ─Éang phß╗Ång vß║Ñn, 5. ─Éang ─æß╗úi naitei, 6. ─Éang thã░ãíng lã░ß╗úng naitei, 7. ─Éang ─æß╗úi nyusha, 8. ─É├ú nyusha, 9. ─Éang chß╗Ø thanh to├ín vß╗øi c├┤ng ty, 10. Gß╗¡i y├¬u cß║ºu thanh to├ín, 11. ─É├ú thanh to├ín, 12. Hß╗ô sãí kh├┤ng hß╗úp lß╗ç, 13. Hß╗ô sãí bß╗ï tr├╣ng, 14. Hß╗ô sãí kh├┤ng ─æß║ít, 15. Kß║┐t quß║ú trã░ß╗út, 16. Hß╗ºy giß╗»a chß╗½ng, 17. Kh├┤ng shodaku',
  `cv_id` bigint unsigned DEFAULT NULL,
  `cv_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'M├ú CV (code) tham chiß║┐u cv_storages.code',
  `cv_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monthly_salary` decimal(15,2) DEFAULT NULL,
  `yearly_salary` decimal(15,2) DEFAULT NULL COMMENT 'Lương năm của ứng viên (VND hoặc 万円)',
  `applied_at` timestamp NULL DEFAULT NULL,
  `interview_date` datetime DEFAULT NULL,
  `interview_round2_date` datetime DEFAULT NULL,
  `nyusha_date` date DEFAULT NULL,
  `expected_payment_date` date DEFAULT NULL,
  `assignment_note` text COLLATE utf8mb4_unicode_ci,
  `memo` text COLLATE utf8mb4_unicode_ci,
  `reject_note` text COLLATE utf8mb4_unicode_ci COMMENT 'L├¢ do tß╗½ chß╗æi',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` text COLLATE utf8mb4_unicode_ci,
  `reject_note_en` text COLLATE utf8mb4_unicode_ci,
  `title_jp` text COLLATE utf8mb4_unicode_ci,
  `reject_note_jp` text COLLATE utf8mb4_unicode_ci,
  `assignment_note_jp` text COLLATE utf8mb4_unicode_ci,
  `memo_jp` text COLLATE utf8mb4_unicode_ci,
  `assignment_note_en` text COLLATE utf8mb4_unicode_ci,
  `memo_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_job_applications_job` (`job_id`),
  KEY `fk_job_applications_collaborator` (`collaborator_id`),
  KEY `fk_job_applications_cv` (`cv_code`),
  KEY `fk_job_applications_admin` (`admin_id`),
  KEY `fk_job_applications_admin_responsible` (`admin_responsible_id`),
  KEY `idx_job_applications_cv_id` (`cv_id`),
  KEY `idx_job_applications_applicant_id` (`applicant_id`),
  KEY `idx_ja_job_deleted_count` (`job_id`,`deleted_at`),
  CONSTRAINT `fk_job_applications_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_applications_admin_responsible` FOREIGN KEY (`admin_responsible_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_applications_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_applications_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_applications_cv_id` FOREIGN KEY (`cv_id`) REFERENCES `cv_storages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_job_applications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1580 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_campaigns`
--

DROP TABLE IF EXISTS `job_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint unsigned NOT NULL,
  `job_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_campaign_job` (`campaign_id`,`job_id`),
  KEY `fk_job_campaigns_job` (`job_id`),
  CONSTRAINT `fk_job_campaigns_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_campaigns_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1561 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_categories`
--

DROP TABLE IF EXISTS `job_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `parent_id` bigint unsigned DEFAULT NULL,
  `order` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0: inactive, 1: active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_categories_parent` (`parent_id`),
  CONSTRAINT `fk_job_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `job_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=366 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_pickups`
--

DROP TABLE IF EXISTS `job_pickups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_pickups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Đường dẫn ảnh cover — S3 key hoặc URL/path',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_pickups_id`
--

DROP TABLE IF EXISTS `job_pickups_id`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_pickups_id` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_job_pickups` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa job_pickups',
  `id_job` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa job',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_pickups_id_pickup` (`id_job_pickups`),
  KEY `fk_job_pickups_id_job` (`id_job`),
  CONSTRAINT `fk_job_pickups_id_job` FOREIGN KEY (`id_job`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_pickups_id_pickup` FOREIGN KEY (`id_job_pickups`) REFERENCES `job_pickups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_recruiting_companies`
--

DROP TABLE IF EXISTS `job_recruiting_companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_recruiting_companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL COMMENT 'ID của job',
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tên công ty',
  `revenue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Doanh thu',
  `number_of_employees` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Số nhân viên',
  `headquarters` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Trụ sở tại',
  `company_introduction` text COLLATE utf8mb4_unicode_ci COMMENT 'Giới thiệu chung về công ty',
  `stock_exchange_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Thông tin trên sàn chứng khoán',
  `investment_capital` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Vốn đầu tư',
  `established_date` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Thành lập',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `company_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revenue_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number_of_employees_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headquarters_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_introduction_en` text COLLATE utf8mb4_unicode_ci,
  `stock_exchange_info_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `investment_capital_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `established_date_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revenue_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number_of_employees_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headquarters_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_introduction_jp` text COLLATE utf8mb4_unicode_ci,
  `stock_exchange_info_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `investment_capital_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `established_date_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_recruiting_company` (`job_id`),
  KEY `fk_job_recruiting_companies_job` (`job_id`),
  KEY `idx_jrc_job_deleted` (`job_id`,`deleted_at`),
  CONSTRAINT `fk_job_recruiting_companies_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=631 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thông tin công ty tuyển dụng thực tế trong JD';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_recruiting_company_business_sectors`
--

DROP TABLE IF EXISTS `job_recruiting_company_business_sectors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_recruiting_company_business_sectors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_recruiting_company_id` bigint unsigned NOT NULL COMMENT 'ID của job_recruiting_company',
  `sector_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên lĩnh vực kinh doanh',
  `order` int NOT NULL DEFAULT '0' COMMENT 'Thứ tự hiển thị',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `sector_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sector_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_recruiting_company_business_sectors_company` (`job_recruiting_company_id`),
  CONSTRAINT `fk_job_recruiting_company_business_sectors_company` FOREIGN KEY (`job_recruiting_company_id`) REFERENCES `job_recruiting_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1941 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Các lĩnh vực kinh doanh của công ty tuyển dụng';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_recruiting_company_services`
--

DROP TABLE IF EXISTS `job_recruiting_company_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_recruiting_company_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_recruiting_company_id` bigint unsigned NOT NULL COMMENT 'ID của job_recruiting_company',
  `service_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên dịch vụ',
  `order` int NOT NULL DEFAULT '0' COMMENT 'Thứ tự hiển thị',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `service_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_recruiting_company_services_company` (`job_recruiting_company_id`),
  CONSTRAINT `fk_job_recruiting_company_services_company` FOREIGN KEY (`job_recruiting_company_id`) REFERENCES `job_recruiting_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=901 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Các dịch vụ cung cấp của công ty tuyển dụng';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_values`
--

DROP TABLE IF EXISTS `job_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_values` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa job',
  `id_typename` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa type',
  `id_value` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa value',
  `value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Gi├í trß╗ï cß╗Ñ thß╗â (v├¡ dß╗Ñ: sß╗æ tiß╗ün, phß║ºn tr─âm)',
  `is_required` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0: Kh├┤ng bß║»t buß╗Öc, 1: Bß║»t buß╗Öc',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `value_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `view_on_collaborator` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Giá trị hiển thị cho CTV',
  `view_on_collaborator_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `view_on_collaborator_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_job_values_job` (`job_id`),
  KEY `fk_job_values_type` (`id_typename`),
  KEY `fk_job_values_value` (`id_value`),
  CONSTRAINT `fk_job_values_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_values_type` FOREIGN KEY (`id_typename`) REFERENCES `types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_job_values_value` FOREIGN KEY (`id_value`) REFERENCES `values` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5308 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_category_id` bigint unsigned NOT NULL,
  `business_sector_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `instruction` text COLLATE utf8mb4_unicode_ci,
  `interview_location` tinyint DEFAULT NULL COMMENT '1: Viß╗çt Nam, 2: Nhß║¡t Bß║ún, 3: Viß╗çt Nam & Nhß║¡t Bß║ún',
  `number_of_hires` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Số lượng tuyển dụng (VI)',
  `number_of_hires_en` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number_of_hires_jp` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bonus` text COLLATE utf8mb4_unicode_ci,
  `salary_review` text COLLATE utf8mb4_unicode_ci,
  `holidays` text COLLATE utf8mb4_unicode_ci,
  `social_insurance` text COLLATE utf8mb4_unicode_ci,
  `transportation` text COLLATE utf8mb4_unicode_ci,
  `break_time` text COLLATE utf8mb4_unicode_ci,
  `overtime` text COLLATE utf8mb4_unicode_ci,
  `recruitment_type` tinyint DEFAULT NULL COMMENT '1: Nh├ón vi├¬n ch├¡nh thß╗®c, 2: Nh├ón vi├¬n ch├¡nh thß╗®c (c├┤ng ty haken; hß╗úp ─æß╗ông v├┤ thß╗Øi hß║ín), 3: Nh├ón vi├¬n haken (hß╗úp ─æß╗ông c├│ thß╗Øi hß║ín), 4: Nh├ón vi├¬n hß╗úp ─æß╗ông',
  `contract_period` text COLLATE utf8mb4_unicode_ci,
  `company_id` bigint unsigned DEFAULT NULL,
  `recruitment_process` text COLLATE utf8mb4_unicode_ci,
  `views_count` int NOT NULL DEFAULT '0',
  `deadline` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0: Draft, 1: Published, 2: Closed, 3: Expired',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `jd_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jd_original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_hot` tinyint(1) DEFAULT '0' COMMENT '0: Kh├┤ng, 1: C├│',
  `job_commission_type` enum('fixed','percent') COLLATE utf8mb4_unicode_ci DEFAULT 'fixed' COMMENT 'Loß║íi hoa hß╗ông: fixed = cß╗æ ─æß╗ïnh, percent = phß║ºn tr─âm',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `required_cv_form` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '─Éã░ß╗Øng dß║½n file form CV bß║»t buß╗Öc cß╗ºa kh├ích h├áng',
  `required_cv_form_original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'T├¬n file gß╗æc cß╗ºa form CV bß║»t buß╗Öc',
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `instruction_en` text COLLATE utf8mb4_unicode_ci,
  `bonus_en` text COLLATE utf8mb4_unicode_ci,
  `salary_review_en` text COLLATE utf8mb4_unicode_ci,
  `holidays_en` text COLLATE utf8mb4_unicode_ci,
  `social_insurance_en` text COLLATE utf8mb4_unicode_ci,
  `transportation_en` text COLLATE utf8mb4_unicode_ci,
  `break_time_en` text COLLATE utf8mb4_unicode_ci,
  `overtime_en` text COLLATE utf8mb4_unicode_ci,
  `contract_period_en` text COLLATE utf8mb4_unicode_ci,
  `recruitment_process_en` text COLLATE utf8mb4_unicode_ci,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_jp` text COLLATE utf8mb4_unicode_ci,
  `instruction_jp` text COLLATE utf8mb4_unicode_ci,
  `recruitment_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Lý do tuyển dụng (VI)',
  `recruitment_reason_en` text COLLATE utf8mb4_unicode_ci,
  `recruitment_reason_jp` text COLLATE utf8mb4_unicode_ci,
  `bonus_jp` text COLLATE utf8mb4_unicode_ci,
  `salary_review_jp` text COLLATE utf8mb4_unicode_ci,
  `holidays_jp` text COLLATE utf8mb4_unicode_ci,
  `holiday_details` text COLLATE utf8mb4_unicode_ci COMMENT 'Chi tiết ngày nghỉ (VI)',
  `holiday_details_en` text COLLATE utf8mb4_unicode_ci,
  `holiday_details_jp` text COLLATE utf8mb4_unicode_ci,
  `social_insurance_jp` text COLLATE utf8mb4_unicode_ci,
  `transportation_jp` text COLLATE utf8mb4_unicode_ci,
  `break_time_jp` text COLLATE utf8mb4_unicode_ci,
  `overtime_jp` text COLLATE utf8mb4_unicode_ci,
  `contract_period_jp` text COLLATE utf8mb4_unicode_ci,
  `recruitment_process_jp` text COLLATE utf8mb4_unicode_ci,
  `highlights` text COLLATE utf8mb4_unicode_ci,
  `residence_status` text COLLATE utf8mb4_unicode_ci,
  `residence_status_en` text COLLATE utf8mb4_unicode_ci,
  `residence_status_jp` text COLLATE utf8mb4_unicode_ci,
  `probation_period` text COLLATE utf8mb4_unicode_ci,
  `probation_period_en` text COLLATE utf8mb4_unicode_ci,
  `probation_period_jp` text COLLATE utf8mb4_unicode_ci,
  `probation_detail` text COLLATE utf8mb4_unicode_ci,
  `probation_detail_en` text COLLATE utf8mb4_unicode_ci,
  `probation_detail_jp` text COLLATE utf8mb4_unicode_ci,
  `jd_original_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jd_file_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jd_file_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_ability` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_ability_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_ability_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_advise_vi` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin advise (vi)',
  `admin_advise_en` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin advise (en)',
  `admin_advise_jp` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin advise (jp)',
  `business_sector_key_jp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `highlights_jp` text COLLATE utf8mb4_unicode_ci,
  `admin_advise_vi_jp` text COLLATE utf8mb4_unicode_ci,
  `business_sector_key_en` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `highlights_en` text COLLATE utf8mb4_unicode_ci,
  `admin_advise_vi_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_jobs_category` (`job_category_id`),
  KEY `idx_jobs_list_status_created_id` (`status`,`created_at`,`id`),
  KEY `idx_jobs_list_status_deadline_id` (`status`,`deadline`,`id`),
  KEY `idx_jobs_list_category_status` (`job_category_id`,`status`,`id`),
  KEY `idx_jobs_list_company_status` (`company_id`,`status`,`id`),
  KEY `idx_jobs_list_hot_pinned` (`is_hot`,`is_pinned`,`status`,`id`),
  CONSTRAINT `fk_jobs_category` FOREIGN KEY (`job_category_id`) REFERENCES `job_categories` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=615 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mail_settings`
--

DROP TABLE IF EXISTS `mail_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mail_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` tinyint NOT NULL COMMENT '1: CC, 2: BCC',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `note_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_application_id` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa job_application li├¬n quan',
  `admin_id` bigint unsigned DEFAULT NULL COMMENT 'Admin gß╗¡i/nhß║¡n tin nhß║»n',
  `collaborator_id` bigint unsigned DEFAULT NULL COMMENT 'CTV gß╗¡i/nhß║¡n tin nhß║»n',
  `applicant_id` bigint unsigned DEFAULT NULL,
  `sender_type` tinyint NOT NULL COMMENT '1: Admin, 2: Collaborator, 3: System',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nß╗Öi dung tin nhß║»n',
  `attachment_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_size` bigint unsigned DEFAULT NULL,
  `is_read_by_admin` tinyint(1) NOT NULL DEFAULT '0',
  `read_by_admin_id` bigint unsigned DEFAULT NULL,
  `read_by_admin_at` datetime DEFAULT NULL,
  `is_read_by_collaborator` tinyint(1) NOT NULL DEFAULT '0',
  `is_read_by_applicant` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_messages_job_application` (`job_application_id`),
  KEY `fk_messages_admin` (`admin_id`),
  KEY `fk_messages_collaborator` (`collaborator_id`),
  KEY `idx_messages_applicant_id` (`applicant_id`),
  KEY `idx_messages_read_by_admin_id` (`read_by_admin_id`),
  CONSTRAINT `fk_messages_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_job_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_read_by_admin` FOREIGN KEY (`read_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=802 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outlook_connections`
--

DROP TABLE IF EXISTS `outlook_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outlook_connections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `refresh_token` text COLLATE utf8mb4_unicode_ci,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_sync_at` datetime DEFAULT NULL,
  `sync_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `access_token_en` text COLLATE utf8mb4_unicode_ci,
  `refresh_token_en` text COLLATE utf8mb4_unicode_ci,
  `access_token_jp` text COLLATE utf8mb4_unicode_ci,
  `refresh_token_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `outlook_connections_admin_id_unique` (`admin_id`),
  KEY `outlook_connections_admin_id_index` (`admin_id`),
  KEY `outlook_connections_email_index` (`email`),
  CONSTRAINT `outlook_connections_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `overtime_allowance_details`
--

DROP TABLE IF EXISTS `overtime_allowance_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overtime_allowance_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_overtime_allowance_details_job` (`job_id`),
  CONSTRAINT `fk_overtime_allowance_details_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1080 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `overtime_allowances`
--

DROP TABLE IF EXISTS `overtime_allowances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overtime_allowances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `overtime_allowance_range` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `overtime_allowance_range_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overtime_allowance_range_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_overtime_allowances_job` (`job_id`),
  CONSTRAINT `fk_overtime_allowances_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=938 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_requests`
--

DROP TABLE IF EXISTS `payment_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned NOT NULL,
  `job_application_id` bigint unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0: Chß╗Ø duyß╗çt, 1: ─É├ú duyß╗çt, 2: Tß╗½ chß╗æi, 3: ─É├ú thanh to├ín',
  `note` text COLLATE utf8mb4_unicode_ci,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `note_en` text COLLATE utf8mb4_unicode_ci,
  `rejected_reason_en` text COLLATE utf8mb4_unicode_ci,
  `note_jp` text COLLATE utf8mb4_unicode_ci,
  `rejected_reason_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_payment_requests_collaborator` (`collaborator_id`),
  KEY `fk_payment_requests_job_application` (`job_application_id`),
  CONSTRAINT `fk_payment_requests_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_requests_job_application` FOREIGN KEY (`job_application_id`) REFERENCES `job_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `type` tinyint NOT NULL DEFAULT '1',
  `visibility_mask` tinyint unsigned NOT NULL DEFAULT '7' COMMENT 'bit1=agent home, bit2=public CTV landing, bit4=public candidate landing',
  `category_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author_id` bigint unsigned DEFAULT NULL,
  `view_count` int NOT NULL DEFAULT '0',
  `like_count` int NOT NULL DEFAULT '0',
  `tag` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_keywords` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `image_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tag_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_title_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_description_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_keywords_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_image_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `image_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tag_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_title_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_description_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_keywords_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_image_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_posts_author` (`author_id`),
  CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts_campaign`
--

DROP TABLE IF EXISTS `posts_campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_campaign` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `campaign_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posts_campaign_post_campaign` (`post_id`,`campaign_id`),
  KEY `idx_posts_campaign_campaign_id` (`campaign_id`),
  CONSTRAINT `fk_posts_campaign_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_posts_campaign_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts_event`
--

DROP TABLE IF EXISTS `posts_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL,
  `event_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posts_event_post_event` (`post_id`,`event_id`),
  KEY `idx_posts_event_event_id` (`event_id`),
  CONSTRAINT `fk_posts_event_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_posts_event_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_candidate_chat_messages`
--

DROP TABLE IF EXISTS `public_candidate_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_candidate_chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned NOT NULL,
  `sender_type` enum('visitor','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `body_jp` text COLLATE utf8mb4_unicode_ci,
  `body_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_public_candidate_chat_messages_session` (`session_id`,`created_at`),
  KEY `fk_public_candidate_chat_messages_admin` (`admin_id`),
  CONSTRAINT `fk_public_candidate_chat_messages_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_public_candidate_chat_messages_session` FOREIGN KEY (`session_id`) REFERENCES `public_candidate_chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_candidate_chat_sessions`
--

DROP TABLE IF EXISTS `public_candidate_chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_candidate_chat_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_token` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitor_label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applicant_id` bigint unsigned DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `last_message_at` datetime DEFAULT NULL,
  `last_visitor_message_at` datetime DEFAULT NULL,
  `admin_last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `session_token_jp` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_label_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_jp` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_token_en` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_label_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_en` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_public_candidate_chat_sessions_token` (`session_token`),
  UNIQUE KEY `uk_public_candidate_chat_sessions_applicant_id` (`applicant_id`),
  KEY `idx_public_candidate_chat_sessions_updated` (`updated_at`),
  CONSTRAINT `fk_public_candidate_chat_sessions_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_ctv_chat_messages`
--

DROP TABLE IF EXISTS `public_ctv_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_ctv_chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned NOT NULL,
  `sender_type` enum('visitor','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `body_jp` text COLLATE utf8mb4_unicode_ci,
  `body_en` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_public_ctv_chat_messages_session` (`session_id`,`created_at`),
  KEY `fk_public_ctv_chat_messages_admin` (`admin_id`),
  CONSTRAINT `fk_public_ctv_chat_messages_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_public_ctv_chat_messages_session` FOREIGN KEY (`session_id`) REFERENCES `public_ctv_chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `public_ctv_chat_sessions`
--

DROP TABLE IF EXISTS `public_ctv_chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `public_ctv_chat_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_token` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitor_label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collaborator_id` bigint unsigned DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `last_message_at` datetime DEFAULT NULL,
  `last_visitor_message_at` datetime DEFAULT NULL,
  `admin_last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `session_token_jp` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_label_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_jp` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_token_en` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_label_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_en` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_public_ctv_chat_sessions_token` (`session_token`),
  UNIQUE KEY `uk_public_ctv_chat_sessions_collaborator_id` (`collaborator_id`),
  KEY `idx_public_ctv_chat_sessions_updated` (`updated_at`),
  CONSTRAINT `fk_public_ctv_chat_sessions_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rank_levels`
--

DROP TABLE IF EXISTS `rank_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rank_levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `percent` decimal(5,2) NOT NULL COMMENT 'Phß║ºn tr─âm hoa hß╗ông cß╗ºa rank',
  `description` text COLLATE utf8mb4_unicode_ci,
  `points_required` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `requirements`
--

DROP TABLE IF EXISTS `requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requirements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'education: Hß╗ìc vß║Ñn, technique: Kß╗╣ thuß║¡t',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'required: Bß║»t buß╗Öc, optional: T├╣y chß╗ìn, first_stand: ã»u ti├¬n',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `type_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  `type_jp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_jp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_requirements_job` (`job_id`),
  CONSTRAINT `fk_requirements_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_range_details`
--

DROP TABLE IF EXISTS `salary_range_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_range_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_salary_range_details_job` (`job_id`),
  CONSTRAINT `fk_salary_range_details_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1601 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_ranges`
--

DROP TABLE IF EXISTS `salary_ranges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_ranges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `salary_range` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'month: Theo th├íng, year: Theo n─âm',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `salary_range_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary_range_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_jp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_salary_ranges_job` (`job_id`),
  KEY `idx_sr_job_deleted` (`job_id`,`deleted_at`),
  CONSTRAINT `fk_salary_ranges_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2626 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `search_history`
--

DROP TABLE IF EXISTS `search_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `search_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collaborator_id` bigint unsigned NOT NULL COMMENT 'ID của collaborator',
  `keyword` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Từ khóa tìm kiếm',
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Các điều kiện lọc đã chọn (JSON)',
  `result_count` int DEFAULT '0' COMMENT 'Số lượng kết quả tìm được',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `keyword_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filters_en` longtext COLLATE utf8mb4_unicode_ci,
  `keyword_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filters_jp` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_search_history_collaborator_created` (`collaborator_id`,`created_at`),
  CONSTRAINT `fk_search_history_collaborator` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2464 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử tìm kiếm của CTV';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `smoking_policies`
--

DROP TABLE IF EXISTS `smoking_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `smoking_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `allow` tinyint(1) NOT NULL COMMENT '1: Cho ph├®p, 0: Kh├┤ng cho ph├®p',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_smoking_policies_job` (`job_id`),
  CONSTRAINT `fk_smoking_policies_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `smoking_policy_details`
--

DROP TABLE IF EXISTS `smoking_policy_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `smoking_policy_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_smoking_policy_details_job` (`job_id`),
  CONSTRAINT `fk_smoking_policy_details_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1008 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `synced_emails`
--

DROP TABLE IF EXISTS `synced_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `synced_emails` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `outlook_connection_id` bigint unsigned NOT NULL,
  `message_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversation_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `internet_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `body_preview` text COLLATE utf8mb4_unicode_ci,
  `from_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `cc_recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `bcc_recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `received_date_time` datetime DEFAULT NULL,
  `sent_date_time` datetime DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `has_attachments` tinyint(1) NOT NULL DEFAULT '0',
  `importance` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folder` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'inbox',
  `direction` enum('inbound','outbound') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'inbound',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `subject_en` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body_en` text COLLATE utf8mb4_unicode_ci,
  `body_preview_en` text COLLATE utf8mb4_unicode_ci,
  `from_email_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_name_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `cc_recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `bcc_recipients_en` longtext COLLATE utf8mb4_unicode_ci,
  `importance_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folder_en` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_jp` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body_jp` text COLLATE utf8mb4_unicode_ci,
  `body_preview_jp` text COLLATE utf8mb4_unicode_ci,
  `from_email_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_name_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `cc_recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `bcc_recipients_jp` longtext COLLATE utf8mb4_unicode_ci,
  `importance_jp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folder_jp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `synced_emails_message_id_unique` (`message_id`),
  KEY `synced_emails_connection_received` (`outlook_connection_id`,`received_date_time`),
  KEY `synced_emails_message_id` (`message_id`),
  KEY `synced_emails_folder_read` (`folder`,`is_read`),
  CONSTRAINT `synced_emails_connection_fk` FOREIGN KEY (`outlook_connection_id`) REFERENCES `outlook_connections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `synced_emails_chk_1` CHECK (json_valid(`to_recipients`)),
  CONSTRAINT `synced_emails_chk_2` CHECK (json_valid(`cc_recipients`)),
  CONSTRAINT `synced_emails_chk_3` CHECK (json_valid(`bcc_recipients`))
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `types`
--

DROP TABLE IF EXISTS `types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `typename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'T├¬n loß║íi setting (v├¡ dß╗Ñ: JLPT, Experience, Specialization, Qualification)',
  `cv_field` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tên field trong CV để so sánh (ví dụ: jlptLevel, experienceYears, specialization, qualification)',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `typename_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_field_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `typename_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_field_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `values`
--

DROP TABLE IF EXISTS `values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `values` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_typename` bigint unsigned NOT NULL COMMENT 'ID cß╗ºa type',
  `valuename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'T├¬n gi├í trß╗ï (v├¡ dß╗Ñ: N1, N2, N3 cho JLPT; 1Õ╣┤, 2Õ╣┤ cho Experience)',
  `comparison_operator` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Toán tử so sánh: >=, <=, >, <, =, between',
  `comparison_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Giá trị để so sánh (ví dụ: 3 cho N3, 3 cho 3 năm)',
  `comparison_value_end` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Giá trị kết thúc cho between (ví dụ: 5 cho "từ 2 đến 5")',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `valuename_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_operator_en` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_value_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_value_end_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valuename_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_operator_jp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_value_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comparison_value_end_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_values_comparison` (`id_typename`,`comparison_operator`,`comparison_value`),
  CONSTRAINT `fk_values_type` FOREIGN KEY (`id_typename`) REFERENCES `types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `working_hours`
--

DROP TABLE IF EXISTS `working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `working_hours` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `working_hours_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `working_hours_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_working_hours_job` (`job_id`),
  CONSTRAINT `fk_working_hours_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1907 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `working_hours_details`
--

DROP TABLE IF EXISTS `working_hours_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_hours_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_working_hours_details_job` (`job_id`),
  CONSTRAINT `fk_working_hours_details_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1942 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `working_location_details`
--

DROP TABLE IF EXISTS `working_location_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_location_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `content_en` text COLLATE utf8mb4_unicode_ci,
  `content_jp` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_working_location_details_job` (`job_id`),
  KEY `idx_wld_job_deleted` (`job_id`,`deleted_at`),
  CONSTRAINT `fk_working_location_details_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1921 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `working_locations`
--

DROP TABLE IF EXISTS `working_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `working_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `location_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_en` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_jp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_working_locations_job` (`job_id`),
  KEY `idx_wl_job_deleted` (`job_id`,`deleted_at`),
  CONSTRAINT `fk_working_locations_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4016 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-22  4:57:49


-- =========================
-- CONTACT UNLOCK SYSTEM
-- =========================

CREATE TABLE point_wallets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    balance INT DEFAULT 0,

    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE point_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    type ENUM('deposit', 'spend'),
    points INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================
-- CONTACT UNLOCK HISTORY
-- =========================

CREATE TABLE unlocked_candidates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);


-- =========================
-- HEADHUNT REQUESTS
-- =========================

CREATE TABLE headhunt_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    job_id BIGINT,
    requirements TEXT,
    status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- =========================
-- SERVICE PACKAGES
-- =========================

CREATE TABLE service_packages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(15,2),
    type ENUM('scout', 'headhunt', 'marketing')
);

-- =========================
-- COMPANY PACKAGE ORDERS
-- =========================

CREATE TABLE package_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    package_id BIGINT NOT NULL,
    amount DECIMAL(15,2),
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (package_id) REFERENCES service_packages(id)
);

-- =========================
-- RECRUITMENT PAGES
-- =========================

CREATE TABLE recruitment_pages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    slug VARCHAR(255) UNIQUE,
    banner_url TEXT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id)
);
