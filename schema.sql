-- =====================================================================
-- SurplusSync - Database Schema & Seed Data
-- Platform: MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+ (LAMP Stack)
-- Full Feature Implementation matching Food-Redistribution-Platform-main
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `foodshare_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `foodshare_db`;

-- Drop existing tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `donation_feedback`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `bookmarks`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `pickups`;
DROP TABLE IF EXISTS `claims`;
DROP TABLE IF EXISTS `donations`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Table: users
-- Supports DONOR, NGO, VOLUNTEER, ADMIN with Certificate Upload for NGOs
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('DONOR', 'NGO', 'VOLUNTEER', 'ADMIN') NOT NULL DEFAULT 'DONOR',
  `phone` VARCHAR(30) NULL,
  `organization_name` VARCHAR(150) NOT NULL,
  `organization_type` VARCHAR(50) DEFAULT 'Restaurant',
  `approx_location` VARCHAR(150) NOT NULL,
  `full_address` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `certificate_url` VARCHAR(500) NULL,
  `is_verified` TINYINT(1) DEFAULT 1,
  `verification_status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: donations
-- Rich food donation items with safety tracking & dietary classifications
-- ---------------------------------------------------------------------
CREATE TABLE `donations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `donor_id` INT NOT NULL,
  `food_name` VARCHAR(200) NOT NULL,
  `category` ENUM('PREPARED_MEAL', 'BAKED_GOODS', 'PRODUCE', 'DAIRY', 'PACKAGED', 'OTHER') NOT NULL DEFAULT 'PREPARED_MEAL',
  `quantity` INT NOT NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'portions',
  `dietary_tags` VARCHAR(255) DEFAULT 'VEGETARIAN',
  `packaging` VARCHAR(100) DEFAULT 'Foil Trays with Lids',
  `temperature_condition` ENUM('HOT', 'CHILLED', 'ROOM_TEMP') DEFAULT 'ROOM_TEMP',
  `hygiene_verified` TINYINT(1) DEFAULT 1,
  `preparation_time` DATETIME NOT NULL,
  `available_until` DATETIME NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `special_notes` TEXT NULL,
  `approx_location` VARCHAR(150) NOT NULL,
  `full_address` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `status` ENUM('AVAILABLE', 'CLAIMED', 'PICKED_UP', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`donor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_donations_status` (`status`),
  INDEX `idx_donations_category` (`category`),
  INDEX `idx_donations_available_until` (`available_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: claims
-- NGO reservation of available food donations
-- ---------------------------------------------------------------------
CREATE TABLE `claims` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `donation_id` INT NOT NULL UNIQUE,
  `ngo_id` INT NOT NULL,
  `estimated_pickup_time` DATETIME NOT NULL,
  `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ngo_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: pickups
-- Volunteer logistics, Open Dispatch Board & 6-digit OTP Handshake
-- ---------------------------------------------------------------------
CREATE TABLE `pickups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `donation_id` INT NOT NULL UNIQUE,
  `volunteer_id` INT NULL,
  `pickup_otp` VARCHAR(10) NOT NULL,
  `delivery_otp` VARCHAR(10) NOT NULL,
  `status` ENUM('CLAIMED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED') DEFAULT 'CLAIMED',
  `pickup_time` DATETIME NULL,
  `delivery_time` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`volunteer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: support_tickets
-- User support and food grievance reports
-- ---------------------------------------------------------------------
CREATE TABLE `support_tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `user_name` VARCHAR(100) NOT NULL,
  `user_email` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  `admin_notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: donation_feedback
-- 5-star ratings and hygiene feedback
-- ---------------------------------------------------------------------
CREATE TABLE `donation_feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `donation_id` INT NOT NULL,
  `from_user_id` INT NOT NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `comment` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: notifications
-- Real-time alerts for donations, claims, near-expiry
-- ---------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: audit_logs
-- Append-only audit trail
-- ---------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NULL,
  `actor_name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(30) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NOT NULL,
  `details` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SEED DATA (Real-World Master Records for Viva / Production Database)
-- =====================================================================

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `organization_name`, `organization_type`, `approx_location`, `full_address`, `latitude`, `longitude`, `avatar_url`, `certificate_url`, `is_verified`, `verification_status`) VALUES
(1, 'Chef Antonio Rossi', 'donor@foodshare.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'DONOR', '+1 (555) 234-8901', 'Bistro Della Spiga', 'Italian Restaurant', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.712776, -74.005974, 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150', NULL, 1, 'APPROVED'),
(2, 'Maria Santos', 'ngo@foodshare.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'NGO', '+1 (555) 345-6789', 'Hope Community Kitchen', 'Shelter & Food Pantry', 'Eastside Community Center', '789 Outreach Blvd', 40.728223, -73.994228, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', 1, 'APPROVED'),
(3, 'Alex Chen', 'volunteer@foodshare.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'VOLUNTEER', '+1 (555) 456-7890', 'EcoRiders Volunteer Squad', 'Cargo Bicycle Logistics', 'Midtown Central', '350 5th Ave', 40.748817, -73.985428, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', NULL, 1, 'APPROVED'),
(4, 'Dr. Sarah Jenkins', 'admin@foodshare.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'ADMIN', '+1 (555) 567-8901', 'Food Safety & Redistribution Board', 'Municipal Governance', 'Civic Center', '100 Municipal Plaza', 40.713829, -74.001648, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', NULL, 1, 'APPROVED'),
(5, 'Brother David Miller', 'pending_ngo@foodshare.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'NGO', '+1 (555) 890-1234', 'St. Jude Homeless Refuge', 'Charity Shelter', 'Northside Harbor', '250 Harbor Light Way', 40.739100, -74.009200, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', 0, 'PENDING'),
(6, 'Elena Rostova', 'elena@metrofoodbank.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'NGO', '+1 (555) 781-9920', 'Metro Community Food Bank', 'Regional Food Bank', 'East River Waterfront', '500 Water St', 40.710100, -73.998000, 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600', 0, 'PENDING'),
(7, 'Arthur Sterling', 'sterling@hv-orchards.org', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'DONOR', '+1 (555) 912-3456', 'Hudson Valley Organic Orchards', 'Agricultural Farm', 'Highland Orchards', 'Route 9W, Highland, NY', 41.385000, -73.950000, 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600', NULL, 1, 'APPROVED'),
(8, 'Chef Laurent Morel', 'laurent@princetonmanor.com', '$2y$10$wK1mJqgPzD7R.f1O43z1seX4oX3mKk2uB9uQ6O0lZ0F2pXgC5s1uK', 'DONOR', '+1 (555) 832-7654', 'Princeton Conference Manor Banquets', 'Event Catering', 'Princeton Manor Edge', '100 College Farm Rd, Princeton, NJ', 40.357000, -74.667000, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', NULL, 1, 'APPROVED');

-- Insert Food Donations
INSERT INTO `donations` (`id`, `donor_id`, `food_name`, `category`, `quantity`, `unit`, `dietary_tags`, `packaging`, `temperature_condition`, `hygiene_verified`, `preparation_time`, `available_until`, `image_url`, `special_notes`, `approx_location`, `full_address`, `latitude`, `longitude`, `status`, `created_at`) VALUES
(1, 1, 'Artisan Sourdough Loaves & Olive Focaccia', 'BAKED_GOODS', 35, 'loaves', 'VEGETARIAN,VEGAN', 'Brown Kraft Bakery Bags', 'ROOM_TEMP', 1, 
 DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 5 HOUR),
 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
 'Fresh morning bake surplus from artisan display. Completely intact and crusty.', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.712776, -74.005974, 'AVAILABLE', NOW()),

(2, 1, 'Hyderabadi Dum Biryani & Mirchi Ka Salan', 'PREPARED_MEAL', 60, 'servings', 'HALAL', 'Heavy-Duty Foil Trays with Thermal Seal', 'HOT', 1,
 DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 2 HOUR),
 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
 'Prepared for corporate summit dinner; untouched trays kept above 65°C in chafing dishes.', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.714200, -74.007800, 'AVAILABLE', NOW()),

(3, 1, 'Organic Farm Greens, Spinach & Heritage Carrots', 'PRODUCE', 45, 'kg', 'VEGETARIAN,VEGAN,GLUTEN_FREE', 'Ventilated Wooden Crates', 'ROOM_TEMP', 1,
 DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_ADD(NOW(), INTERVAL 18 HOUR),
 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
 'Crisp farm-to-table surplus from regional co-op delivery. Perfectly fresh and washed.', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.711500, -74.003900, 'AVAILABLE', NOW()),

(4, 1, 'Paneer Tikka Masala & Jeera Basmati Rice', 'PREPARED_MEAL', 40, 'servings', 'VEGETARIAN,GLUTEN_FREE', 'Foil Trays with Thermal Seals', 'HOT', 1,
 DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 3 HOUR),
 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
 'Vegetarian specialty banquet course. Packed hot in separate curry and rice pans.', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.715100, -74.002200, 'AVAILABLE', NOW()),

(5, 1, 'Croissants, Pain au Chocolat & Danish Pastries', 'BAKED_GOODS', 50, 'pieces', 'VEGETARIAN', 'Eco Cardboard Bakery Boxes', 'ROOM_TEMP', 1,
 DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR),
 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
 'Gourmet morning viennoiseries from breakfast banquet service.', 'Downtown Arts District', '412 Renaissance Ave, Suite 100', 40.712100, -74.005100, 'CLAIMED', NOW()),

(6, 1, 'Greek Yogurt Pots & Whole Milk Cartons', 'DAIRY', 30, 'liters', 'VEGETARIAN,GLUTEN_FREE', 'Chilled Insulated Thermal Bags', 'CHILLED', 1,
 DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_ADD(NOW(), INTERVAL 12 HOUR),
 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
 'Cold chain maintained at 4°C continuously. Certified fresh with seal tags.', 'Midtown Central', '600 Lexington Ave', 40.756200, -73.971900, 'AVAILABLE', NOW()),

(7, 7, 'Crisp McIntosh Apples, Pears & Fresh Pressed Cider', 'PRODUCE', 85, 'kg', 'VEGETARIAN,VEGAN,GLUTEN_FREE', 'Wooden Slatted Crates', 'ROOM_TEMP', 1,
 DATE_SUB(NOW(), INTERVAL 7 HOUR), DATE_ADD(NOW(), INTERVAL 20 HOUR),
 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&auto=format&fit=crop&q=80',
 'Regional orchard harvest surplus. Washed, sorted and packaged.', 'Hudson Valley Orchards (Out-of-Region)', 'Route 9W, Highland, NY', 41.385000, -73.950000, 'AVAILABLE', NOW()),

(8, 8, 'Slow Roasted Herb Beef, Rich Pan Gravy & Roasted Potatoes', 'PREPARED_MEAL', 50, 'servings', 'HALAL', 'Stainless Gastronorm Sealed Pans', 'HOT', 1,
 DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 3 HOUR),
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
 'High-end conference banquet surplus. Kept hot above 65°C.', 'Princeton Conference Manor (Regional Boundary)', '100 College Farm Rd, Princeton, NJ', 40.357000, -74.667000, 'AVAILABLE', NOW());

-- Seed Claim
INSERT INTO `claims` (`id`, `donation_id`, `ngo_id`, `estimated_pickup_time`, `status`, `created_at`) VALUES
(1, 5, 2, DATE_ADD(NOW(), INTERVAL 1 HOUR), 'ACTIVE', NOW());

-- Seed Pickup Assignment waiting for volunteer courier (Open Dispatch Board)
INSERT INTO `pickups` (`id`, `donation_id`, `volunteer_id`, `pickup_otp`, `delivery_otp`, `status`, `created_at`) VALUES
(1, 5, NULL, '749215', '381904', 'CLAIMED', NOW());

-- Seed Initial Support Tickets
INSERT INTO `support_tickets` (`id`, `user_id`, `user_name`, `user_email`, `subject`, `description`, `priority`, `status`) VALUES
(1, 2, 'Maria Santos', 'ngo@foodshare.org', 'Urgent need for refrigerated insulated transport bag', 'We have large batch of dairy arriving this evening. Can dispatch support team?', 'HIGH', 'OPEN'),
(2, 1, 'Chef Antonio Rossi', 'donor@foodshare.org', 'Question about tax-deductible surplus certificate generation', 'Where can I download the cumulative monthly donor receipt PDF?', 'LOW', 'RESOLVED'),
(3, 3, 'Alex Chen', 'volunteer@foodshare.org', 'Heavy road construction on 8th Ave detour logged', 'Road detour on 8th Ave causes 10 min delay for cargo bikes.', 'LOW', 'RESOLVED');

-- Seed Initial Feedback
INSERT INTO `donation_feedback` (`id`, `donation_id`, `from_user_id`, `rating`, `comment`) VALUES
(1, 5, 2, 5, 'Superb quality croissants! The shelter children enjoyed breakfast thoroughly.');

-- Seed Initial Audit Logs
INSERT INTO `audit_logs` (`id`, `actor_id`, `actor_name`, `role`, `action`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES
(101, 1, 'Chef Antonio Rossi', 'DONOR', 'PUBLISH_DONATION', 'Donation', 1, 'Listed 35 loaves Artisan Sourdough with 5hr safety window.', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(102, 1, 'Chef Antonio Rossi', 'DONOR', 'PUBLISH_DONATION', 'Donation', 2, 'Listed 60 portions Hyderabadi Dum Biryani with thermal seal checklist.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(103, 2, 'Maria Santos', 'NGO', 'CLAIM_DONATION', 'Donation', 5, 'Reserved 50 pcs Bakery Pastries for Hope Kitchen evening distribution.', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(104, 4, 'Dr. Sarah Jenkins', 'ADMIN', 'VERIFY_NGO_CERTIFICATE', 'User', 2, 'Approved official non-profit accreditation certificate for Hope Community Kitchen.', DATE_SUB(NOW(), INTERVAL 5 HOUR));
