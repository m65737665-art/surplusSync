<?php
/**
 * NourishNet - Food Donations API
 * Supports List, Filter, Search, Geolocation Distance, Detail, Create, and Delete
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Helper function to calculate Haversine distance in km
function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371; // km
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return round($earthRadius * $c, 2);
}

// -------------------------------------------------------------
// GET: Fetch Donations (List or Single)
// -------------------------------------------------------------
if ($method === 'GET') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    // Single item query
    if ($id > 0) {
        if ($pdo === null) {
            sendJsonResponse(['error' => 'Database not connected.'], 500);
        }
        $stmt = $pdo->prepare("
            SELECT d.*, 
                   u.name as donor_name, 
                   u.organization_name as donor_org, 
                   u.phone as donor_phone,
                   u.avatar_url as donor_avatar,
                   c.ngo_id,
                   c.estimated_pickup_time,
                   ngo.name as ngo_name,
                   ngo.organization_name as ngo_org,
                   p.pickup_otp,
                   p.delivery_otp,
                   p.volunteer_id,
                   v.name as volunteer_name
            FROM donations d
            JOIN users u ON d.donor_id = u.id
            LEFT JOIN claims c ON c.donation_id = d.id AND c.status = 'ACTIVE'
            LEFT JOIN users ngo ON c.ngo_id = ngo.id
            LEFT JOIN pickups p ON p.donation_id = d.id
            LEFT JOIN users v ON p.volunteer_id = v.id
            WHERE d.id = ?
            LIMIT 1
        ");
        $stmt->execute([$id]);
        $donation = $stmt->fetch();
        if (!$donation) {
            sendJsonResponse(['error' => 'Donation not found.'], 404);
        }

        // Mask exact address for public discovery unless user is claimed NGO/donor/courier/admin
        $currUser = $_SESSION['user'] ?? null;
        $isAuthorized = $currUser && (
            $currUser['id'] == $donation['donor_id'] ||
            $currUser['id'] == ($donation['ngo_id'] ?? 0) ||
            $currUser['id'] == ($donation['volunteer_id'] ?? 0) ||
            $currUser['role'] === 'ADMIN'
        );

        if (!$isAuthorized && $donation['status'] === 'AVAILABLE') {
            $donation['full_address'] = $donation['approx_location'] . ' (Exact address revealed upon claim)';
            $donation['donor_phone'] = 'Revealed upon claim';
        }

        // Hide OTP codes from non-participants
        if (!$currUser || ($currUser['id'] != $donation['donor_id'] && $currUser['role'] !== 'ADMIN')) {
            unset($donation['pickup_otp']);
        }
        if (!$currUser || ($currUser['id'] != ($donation['ngo_id'] ?? 0) && $currUser['role'] !== 'ADMIN')) {
            unset($donation['delivery_otp']);
        }

        sendJsonResponse(['success' => true, 'donation' => $donation]);
    }

    // List query with filters
    $category = $_GET['category'] ?? '';
    $dietary = $_GET['dietary'] ?? '';
    $status = $_GET['status'] ?? '';
    $urgency = isset($_GET['urgency']) && $_GET['urgency'] === '1';
    $search = trim($_GET['search'] ?? '');
    $donorIdParam = isset($_GET['donor_id']) ? intval($_GET['donor_id']) : 0;
    $ngoIdParam = isset($_GET['ngo_id']) ? intval($_GET['ngo_id']) : 0;
    $volunteerIdParam = isset($_GET['volunteer_id']) ? intval($_GET['volunteer_id']) : 0;
    $userLat = isset($_GET['lat']) ? floatval($_GET['lat']) : 40.7128;
    $userLng = isset($_GET['lng']) ? floatval($_GET['lng']) : -74.0060;
    $maxRadius = isset($_GET['radius']) ? floatval($_GET['radius']) : 50; // km

    if ($pdo === null) {
        sendJsonResponse(['error' => 'Database not connected. Please import schema.sql.'], 500);
    }

    $sql = "
        SELECT d.*, 
               u.name as donor_name, 
               u.organization_name as donor_org, 
               u.avatar_url as donor_avatar,
               c.ngo_id,
               c.estimated_pickup_time,
               ngo.name as ngo_name,
               ngo.organization_name as ngo_org,
               p.volunteer_id,
               v.name as volunteer_name,
               p.pickup_otp,
               p.delivery_otp
        FROM donations d
        JOIN users u ON d.donor_id = u.id
        LEFT JOIN claims c ON c.donation_id = d.id AND c.status = 'ACTIVE'
        LEFT JOIN users ngo ON c.ngo_id = ngo.id
        LEFT JOIN pickups p ON p.donation_id = d.id
        LEFT JOIN users v ON p.volunteer_id = v.id
        WHERE 1=1
    ";
    $params = [];

    if ($donorIdParam > 0) {
        $sql .= " AND d.donor_id = ?";
        $params[] = $donorIdParam;
    }

    if ($ngoIdParam > 0) {
        $sql .= " AND c.ngo_id = ?";
        $params[] = $ngoIdParam;
    }

    if ($volunteerIdParam > 0) {
        $sql .= " AND p.volunteer_id = ?";
        $params[] = $volunteerIdParam;
    }

    if (!empty($category) && $category !== 'ALL') {
        $sql .= " AND d.category = ?";
        $params[] = $category;
    }

    if (!empty($status)) {
        $sql .= " AND d.status = ?";
        $params[] = $status;
    }

    if (!empty($dietary)) {
        $sql .= " AND d.dietary_tags LIKE ?";
        $params[] = "%" . $dietary . "%";
    }

    if ($urgency) {
        // Expiring within next 3 hours
        $sql .= " AND d.available_until BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 HOUR)";
    }

    if (!empty($search)) {
        $sql .= " AND (d.food_name LIKE ? OR d.special_notes LIKE ? OR u.organization_name LIKE ? OR d.approx_location LIKE ?)";
        $searchTerm = "%" . $search . "%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $sql .= " ORDER BY d.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    // Compute distance and add metadata
    $donations = [];
    $currUser = $_SESSION['user'] ?? null;

    foreach ($results as $row) {
        $dist = calculateDistance($userLat, $userLng, $row['latitude'], $row['longitude']);
        
        // Filter by radius if provided
        if ($maxRadius > 0 && $dist > $maxRadius) {
            continue;
        }

        $row['distance_km'] = $dist;

        // Mask address for public
        $isAuthorized = $currUser && (
            $currUser['id'] == $row['donor_id'] ||
            $currUser['id'] == ($row['ngo_id'] ?? 0) ||
            $currUser['id'] == ($row['volunteer_id'] ?? 0) ||
            $currUser['role'] === 'ADMIN'
        );

        if (!$isAuthorized && $row['status'] === 'AVAILABLE') {
            $row['full_address'] = $row['approx_location'] . ' (Exact location revealed after reservation)';
        }

        // Calculate hours left until expiry
        $expiryTimestamp = strtotime($row['available_until']);
        $diffSec = $expiryTimestamp - time();
        $row['seconds_left'] = max(0, $diffSec);
        $row['is_urgent'] = ($diffSec > 0 && $diffSec <= 10800); // <= 3 hours
        $row['is_expired'] = ($diffSec <= 0);

        $donations[] = $row;
    }

    sendJsonResponse(['success' => true, 'donations' => $donations, 'count' => count($donations)]);
}

// -------------------------------------------------------------
// POST: Create New Food Donation
// -------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $currUser = $_SESSION['user'] ?? null;

    $donorId = $currUser ? $currUser['id'] : 1; // Default to demo Chef Antonio if guest
    $foodName = trim($input['food_name'] ?? '');
    $category = strtoupper(trim($input['category'] ?? 'PREPARED_MEAL'));
    $quantity = intval($input['quantity'] ?? 10);
    $unit = trim($input['unit'] ?? 'servings');
    $dietaryTags = trim($input['dietary_tags'] ?? 'VEGETARIAN');
    $packaging = trim($input['packaging'] ?? 'Insulated Foil Trays');
    $tempCondition = strtoupper(trim($input['temperature_condition'] ?? 'ROOM_TEMP'));
    $prepTime = trim($input['preparation_time'] ?? date('Y-m-d H:i:s'));
    $availUntil = trim($input['available_until'] ?? date('Y-m-d H:i:s', strtotime('+4 hours')));
    $imageUrl = trim($input['image_url'] ?? '');
    $notes = trim($input['special_notes'] ?? '');
    $approxLoc = trim($input['approx_location'] ?? ($currUser['approx_location'] ?? 'Downtown District'));
    $fullAddress = trim($input['full_address'] ?? ($currUser['full_address'] ?? '412 Renaissance Ave'));
    $latitude = floatval($input['latitude'] ?? ($currUser['latitude'] ?? 40.7128));
    $longitude = floatval($input['longitude'] ?? ($currUser['longitude'] ?? -74.0060));

    if (empty($foodName)) {
        sendJsonResponse(['success' => false, 'error' => 'Food title is required.'], 400);
    }

    // Default image if omitted
    if (empty($imageUrl)) {
        $presetImages = [
            'PREPARED_MEAL' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
            'BAKED_GOODS' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
            'PRODUCE' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
            'DAIRY' => 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
            'PACKAGED' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
            'OTHER' => 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80',
        ];
        $imageUrl = $presetImages[$category] ?? $presetImages['PREPARED_MEAL'];
    }

    if ($pdo === null) {
        sendJsonResponse(['success' => false, 'error' => 'Database not connected. Please import schema.sql.'], 500);
    }

    $stmt = $pdo->prepare("
        INSERT INTO donations 
        (donor_id, food_name, category, quantity, unit, dietary_tags, packaging, temperature_condition, hygiene_verified, preparation_time, available_until, image_url, special_notes, approx_location, full_address, latitude, longitude, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', NOW())
    ");
    $stmt->execute([
        $donorId, $foodName, $category, $quantity, $unit, $dietaryTags, $packaging, $tempCondition,
        $prepTime, $availUntil, $imageUrl, $notes, $approxLoc, $fullAddress, $latitude, $longitude
    ]);

    $newDonationId = $pdo->lastInsertId();

    // Log to Audit Trail
    $actorName = $currUser ? $currUser['name'] : 'Chef Antonio Rossi';
    $actorRole = $currUser ? $currUser['role'] : 'DONOR';
    $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, ?, 'PUBLISH_DONATION', 'Donation', ?, ?)");
    $logStmt->execute([$donorId, $actorName, $actorRole, $newDonationId, "Listed {$quantity} {$unit} of {$foodName}"]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Food donation published successfully! Available for nearby NGOs.',
        'donation_id' => $newDonationId
    ], 201);
}

// -------------------------------------------------------------
// DELETE: Cancel Donation
// -------------------------------------------------------------
if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        sendJsonResponse(['success' => false, 'error' => 'Donation ID is required.'], 400);
    }

    if ($pdo === null) {
        sendJsonResponse(['success' => false, 'error' => 'Database not connected.'], 500);
    }

    $stmt = $pdo->prepare("UPDATE donations SET status = 'CANCELLED' WHERE id = ?");
    $stmt->execute([$id]);

    sendJsonResponse(['success' => true, 'message' => 'Donation cancelled.']);
}
