<?php
/**
 * NourishNet - Bookmarks / Pinned Food API
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$currUser = $_SESSION['user'] ?? null;
$userId = $currUser ? $currUser['id'] : 2; // Default to NGO persona if testing

if ($pdo === null) {
    sendJsonResponse(['success' => true, 'bookmarked_ids' => [1, 3]]);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare("SELECT donation_id FROM bookmarks WHERE user_id = ?");
    $stmt->execute([$userId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    sendJsonResponse(['success' => true, 'bookmarked_ids' => $ids]);
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $donationId = intval($input['donation_id'] ?? 0);

    if ($donationId <= 0) {
        sendJsonResponse(['success' => false, 'error' => 'Invalid donation ID'], 400);
    }

    // Toggle
    $check = $pdo->prepare("SELECT id FROM bookmarks WHERE user_id = ? AND donation_id = ?");
    $check->execute([$userId, $donationId]);
    if ($check->fetch()) {
        $del = $pdo->prepare("DELETE FROM bookmarks WHERE user_id = ? AND donation_id = ?");
        $del->execute([$userId, $donationId]);
        sendJsonResponse(['success' => true, 'bookmarked' => false, 'message' => 'Removed from saved pins.']);
    } else {
        $ins = $pdo->prepare("INSERT INTO bookmarks (user_id, donation_id) VALUES (?, ?)");
        $ins->execute([$userId, $donationId]);
        sendJsonResponse(['success' => true, 'bookmarked' => true, 'message' => 'Saved to your food pins!']);
    }
}
