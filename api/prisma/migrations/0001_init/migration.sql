-- CreateTable
CREATE TABLE `accounts_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `password` VARCHAR(128) NOT NULL,
    `last_login` DATETIME(0) NULL,
    `is_superuser` BOOLEAN NOT NULL DEFAULT false,
    `username` VARCHAR(150) NOT NULL,
    `first_name` VARCHAR(150) NOT NULL DEFAULT '',
    `last_name` VARCHAR(150) NOT NULL DEFAULT '',
    `email` VARCHAR(254) NOT NULL DEFAULT '',
    `is_staff` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `date_joined` DATETIME(0) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `business_name` VARCHAR(255) NOT NULL DEFAULT '',
    `business_type` VARCHAR(50) NOT NULL DEFAULT '',
    `address` LONGTEXT NULL,
    `is_customer` BOOLEAN NOT NULL DEFAULT false,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `phone_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,
    `notes` LONGTEXT NULL,

    UNIQUE INDEX `accounts_user_username_key`(`username`),
    UNIQUE INDEX `accounts_user_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts_businessmembership` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `business_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `role` VARCHAR(20) NOT NULL DEFAULT 'cashier',
    `permissions` LONGTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `invited_by_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `accounts_businessmembership_user_id_business_id_key`(`user_id`, `business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts_loginattempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `identifier` VARCHAR(254) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_id` INTEGER NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `outcome` VARCHAR(10) NOT NULL,
    `user_agent` LONGTEXT NULL,
    `timestamp` DATETIME(0) NOT NULL,

    INDEX `accounts_loginattempt_identifier_timestamp_idx`(`identifier`, `timestamp` DESC),
    INDEX `accounts_loginattempt_ip_address_timestamp_idx`(`ip_address`, `timestamp` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers_customerprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `company_name` VARCHAR(255) NOT NULL,
    `tin_number` VARCHAR(100) NOT NULL DEFAULT '',
    `city` VARCHAR(100) NOT NULL DEFAULT '',
    `region` VARCHAR(100) NOT NULL DEFAULT '',
    `country` VARCHAR(100) NOT NULL DEFAULT 'Ethiopia',
    `website` VARCHAR(200) NOT NULL DEFAULT '',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `customers_customerprofile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses_licenseplan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `duration_months` INTEGER NOT NULL,
    `device_limit` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(10, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses_license` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `license_key` VARCHAR(20) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `start_date` DATE NOT NULL,
    `expiry_date` DATE NULL,
    `device_limit` INTEGER NOT NULL,
    `notes` LONGTEXT NULL,
    `is_trial` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `licenses_license_license_key_key`(`license_key`),
    INDEX `licenses_license_status_idx`(`status`),
    INDEX `licenses_license_license_key_status_idx`(`license_key`, `status`),
    INDEX `licenses_license_expiry_date_idx`(`expiry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses_deviceactivation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `license_id` INTEGER NOT NULL,
    `device_id` VARCHAR(255) NOT NULL,
    `device_name` VARCHAR(255) NOT NULL,
    `activation_date` DATETIME(0) NOT NULL,
    `last_seen` DATETIME(0) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `operating_system` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `licenses_deviceactivation_license_id_device_id_key`(`license_id`, `device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses_licenseauditlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `license_id` INTEGER NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `details` LONGTEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL,

    INDEX `licenses_licenseauditlog_action_idx`(`action`),
    INDEX `licenses_licenseauditlog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `license_id` INTEGER NULL,
    `plan_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `transaction_id` VARCHAR(100) NOT NULL,
    `receipt_image` VARCHAR(100) NULL,
    `payment_method` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `admin_notes` LONGTEXT NULL,
    `reviewed_by_id` INTEGER NULL,
    `reviewed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `payments_payment_transaction_id_key`(`transaction_id`),
    INDEX `payments_payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments_invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(50) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `payment_id` INTEGER NULL,
    `license_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `due_date` DATE NOT NULL,
    `paid_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `payments_invoice_invoice_number_key`(`invoice_number`),
    UNIQUE INDEX `payments_invoice_payment_id_key`(`payment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications_notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_id` INTEGER NOT NULL,
    `notification_type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` LONGTEXT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `link` VARCHAR(500) NOT NULL DEFAULT '',
    `created_at` DATETIME(0) NOT NULL,

    INDEX `notifications_notification_recipient_id_idx`(`recipient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_refreshtoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `jti` VARCHAR(64) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `revoked_at` DATETIME(0) NULL,
    `replaced_by_jti` VARCHAR(64) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NOT NULL DEFAULT '',
    `created_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `auth_refreshtoken_jti_key`(`jti`),
    UNIQUE INDEX `auth_refreshtoken_token_hash_key`(`token_hash`),
    INDEX `auth_refreshtoken_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_systemsetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` LONGTEXT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'string',
    `description` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `admin_api_systemsetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_featureflag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `is_beta` BOOLEAN NOT NULL DEFAULT false,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `admin_api_featureflag_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_appversion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform` VARCHAR(20) NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `min_version` VARCHAR(20) NOT NULL DEFAULT '',
    `is_force_update` BOOLEAN NOT NULL DEFAULT false,
    `release_notes` LONGTEXT NULL,
    `download_url` VARCHAR(200) NOT NULL DEFAULT '',
    `created_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `admin_api_appversion_platform_version_key`(`platform`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_supportticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `business_id` INTEGER NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `assigned_to_id` INTEGER NULL,
    `platform` VARCHAR(20) NOT NULL DEFAULT 'other',
    `created_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `admin_api_supportticket_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_supportreply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `admin_id` INTEGER NULL,
    `message` LONGTEXT NULL,
    `is_internal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_auditlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(100) NOT NULL,
    `resource_id` VARCHAR(255) NOT NULL DEFAULT '',
    `details` LONGTEXT NULL,
    `before_state` LONGTEXT NULL,
    `after_state` LONGTEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NOT NULL DEFAULT '',
    `created_at` DATETIME(0) NOT NULL,

    INDEX `admin_api_auditlog_admin_id_idx`(`admin_id`),
    INDEX `admin_api_auditlog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_api_adminsession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_id` INTEGER NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NOT NULL DEFAULT '',
    `login_time` DATETIME(0) NOT NULL,
    `logout_time` DATETIME(0) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `admin_api_adminsession_admin_id_idx`(`admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts_businessmembership` ADD CONSTRAINT `accounts_businessmembership_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts_businessmembership` ADD CONSTRAINT `accounts_businessmembership_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts_businessmembership` ADD CONSTRAINT `accounts_businessmembership_invited_by_id_fkey` FOREIGN KEY (`invited_by_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts_loginattempt` ADD CONSTRAINT `accounts_loginattempt_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers_customerprofile` ADD CONSTRAINT `customers_customerprofile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses_license` ADD CONSTRAINT `licenses_license_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses_license` ADD CONSTRAINT `licenses_license_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `licenses_licenseplan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses_deviceactivation` ADD CONSTRAINT `licenses_deviceactivation_license_id_fkey` FOREIGN KEY (`license_id`) REFERENCES `licenses_license`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses_licenseauditlog` ADD CONSTRAINT `licenses_licenseauditlog_license_id_fkey` FOREIGN KEY (`license_id`) REFERENCES `licenses_license`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses_licenseauditlog` ADD CONSTRAINT `licenses_licenseauditlog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_payment` ADD CONSTRAINT `payments_payment_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_payment` ADD CONSTRAINT `payments_payment_license_id_fkey` FOREIGN KEY (`license_id`) REFERENCES `licenses_license`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_payment` ADD CONSTRAINT `payments_payment_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `licenses_licenseplan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_payment` ADD CONSTRAINT `payments_payment_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_invoice` ADD CONSTRAINT `payments_invoice_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_invoice` ADD CONSTRAINT `payments_invoice_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments_payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments_invoice` ADD CONSTRAINT `payments_invoice_license_id_fkey` FOREIGN KEY (`license_id`) REFERENCES `licenses_license`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications_notification` ADD CONSTRAINT `notifications_notification_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_refreshtoken` ADD CONSTRAINT `auth_refreshtoken_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_supportticket` ADD CONSTRAINT `admin_api_supportticket_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_supportticket` ADD CONSTRAINT `admin_api_supportticket_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_supportreply` ADD CONSTRAINT `admin_api_supportreply_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `admin_api_supportticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_supportreply` ADD CONSTRAINT `admin_api_supportreply_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_auditlog` ADD CONSTRAINT `admin_api_auditlog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `accounts_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_api_adminsession` ADD CONSTRAINT `admin_api_adminsession_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `accounts_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
