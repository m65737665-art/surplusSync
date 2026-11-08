<?php
/**
 * NourishNet / FoodShare - System Configuration
 * Optimized for standard LAMP / XAMPP / Ubuntu Apache2 + MariaDB/MySQL environments
 */

// Error reporting (set to 0 in strict production)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Database Credentials
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'foodshare_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Session & App Settings
define('APP_NAME', 'NourishNet Food Redistribution');
define('APP_SECRET', 'nourishnet_final_year_project_super_secret_key_2026');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5 MB

// Helper: Ensure session starts cleanly
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// JSON Header Helper
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}
