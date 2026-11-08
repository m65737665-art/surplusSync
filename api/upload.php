<?php
/**
 * NourishNet - Secure Image Upload API
 * Handles food donation photos with validation against malicious files
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['success' => false, 'error' => 'POST request expected.'], 405);
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    sendJsonResponse(['success' => false, 'error' => 'No image file uploaded or upload error occurred.'], 400);
}

$file = $_FILES['image'];

// 1. File size check (5 MB limit)
if ($file['size'] > MAX_UPLOAD_SIZE) {
    sendJsonResponse(['success' => false, 'error' => 'File size exceeds maximum limit of 5 MB.'], 400);
}

// 2. MIME type inspection using finfo
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

$allowedMimes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];

if (!array_key_exists($mimeType, $allowedMimes)) {
    sendJsonResponse(['success' => false, 'error' => 'Only JPEG, PNG, WEBP, and GIF images are allowed.'], 400);
}

// 3. Double extension protection
$originalName = basename($file['name']);
if (substr_count($originalName, '.') > 1) {
    sendJsonResponse(['success' => false, 'error' => 'Suspicious double file extension rejected.'], 400);
}

// 4. Generate random safe filename
$ext = $allowedMimes[$mimeType];
$safeFilename = 'food_' . bin2hex(random_bytes(10)) . '.' . $ext;

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

$targetPath = UPLOAD_DIR . $safeFilename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $publicUrl = 'uploads/' . $safeFilename;
    sendJsonResponse([
        'success' => true,
        'image_url' => $publicUrl,
        'filename' => $safeFilename
    ]);
} else {
    sendJsonResponse(['success' => false, 'error' => 'Failed to save uploaded file.'], 500);
}
