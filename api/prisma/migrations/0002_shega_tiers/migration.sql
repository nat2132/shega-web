-- Shega feature tiers: plan pricing metadata (edition + add-ons)
ALTER TABLE `licenses_licenseplan`
    ADD COLUMN `edition` VARCHAR(20) NOT NULL DEFAULT 'both',
    ADD COLUMN `included_mobile_devices` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `included_desktop_devices` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `included_businesses` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `addon_mobile_price` DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    ADD COLUMN `addon_desktop_price` DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
    ADD COLUMN `addon_business_price` DECIMAL(10, 2) NOT NULL DEFAULT 1000.00;

-- License entitlement counters (derived from base plan + approved add-ons)
ALTER TABLE `licenses_license`
    ADD COLUMN `max_mobile_devices` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `max_desktop_devices` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `max_businesses` INTEGER NOT NULL DEFAULT 1;

-- Device type (MOBILE | DESKTOP) for entitlement-aware activation
ALTER TABLE `licenses_deviceactivation`
    ADD COLUMN `device_type` VARCHAR(10) NOT NULL DEFAULT 'MOBILE';

-- Payment classification: base subscription vs add-on purchases
ALTER TABLE `payments_payment`
    ADD COLUMN `payment_type` VARCHAR(30) NOT NULL DEFAULT 'subscription',
    ADD COLUMN `quantity` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `description` VARCHAR(255) NOT NULL DEFAULT '';

-- Marketing contact messages (public contact form)
CREATE TABLE `marketing_contactmessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` LONGTEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'new',
    `created_at` DATETIME(0) NOT NULL,

    INDEX `marketing_contactmessage_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;