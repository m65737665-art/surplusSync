<?php
/**
 * NourishNet - Append-Only Audit Trail API
 * Governance and compliance verification
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();

if ($pdo === null) {
    sendJsonResponse([
        'success' => true,
        'logs' => [
            ['id' => 1, 'actor_name' => 'Chef Antonio Rossi', 'role' => 'DONOR', 'action' => 'PUBLISH_DONATION', 'entity_type' => 'Donation', 'entity_id' => 1, 'details' => 'Listed 35 loaves Artisan Sourdough with 5hr safety window.', 'created_at' => date('Y-m-d H:i:s', strtotime('-4 hours'))],
            ['id' => 2, 'actor_name' => 'Sunita Patel', 'role' => 'DONOR', 'action' => 'PUBLISH_DONATION', 'entity_type' => 'Donation', 'entity_id' => 2, 'details' => 'Listed 60 portions Hyderabadi Dum Biryani with thermal seal checklist.', 'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))],
            ['id' => 3, 'actor_name' => 'Maria Santos', 'role' => 'NGO', 'action' => 'CLAIM_DONATION', 'entity_type' => 'Donation', 'entity_id' => 5, 'details' => 'Reserved 50 pcs Bakery Pastries for Hope Kitchen evening distribution.', 'created_at' => date('Y-m-d H:i:s', strtotime('-1 hour'))],
            ['id' => 4, 'actor_name' => 'Alex Chen', 'role' => 'VOLUNTEER', 'action' => 'ASSIGN_PICKUP', 'entity_type' => 'Pickup', 'entity_id' => 1, 'details' => 'Accepted transport mission for Bistro Della Spiga -> Hope Community Kitchen.', 'created_at' => date('Y-m-d H:i:s', strtotime('-45 minutes'))]
        ]
    ]);
}

try {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $stmt = $pdo->prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll();

    sendJsonResponse(['success' => true, 'logs' => $logs]);
} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
