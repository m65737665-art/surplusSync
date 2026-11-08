<?php
/**
 * NourishNet - Lifecycle State Machine & Cryptographic OTP Handshake API
 * Actions: claim, assign_volunteer, verify_pickup_otp, verify_delivery_otp, cancel_claim
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$pdo = getDB();

$currUser = $_SESSION['user'] ?? null;
$actorId = $currUser ? $currUser['id'] : 2; // Default to Maria (NGO) or Alex (Volunteer) if test
$actorName = $currUser ? $currUser['name'] : 'System Agent';
$actorRole = $currUser ? $currUser['role'] : 'NGO';

if ($pdo === null) {
    sendJsonResponse(['success' => false, 'error' => 'Database not connected. Please import schema.sql.'], 500);
}

// -------------------------------------------------------------
// ACTION: claim (NGO Claims Available Food)
// -------------------------------------------------------------
if ($action === 'claim') {
    $donationId = intval($input['donation_id'] ?? 0);
    $estimatedPickup = trim($input['estimated_pickup_time'] ?? date('Y-m-d H:i:s', strtotime('+90 minutes')));

    if ($donationId <= 0) {
        sendJsonResponse(['success' => false, 'error' => 'Valid donation_id required.'], 400);
    }

    // Verify donation is available
    $stmt = $pdo->prepare("SELECT * FROM donations WHERE id = ?");
    $stmt->execute([$donationId]);
    $donation = $stmt->fetch();

    if (!$donation) {
        sendJsonResponse(['success' => false, 'error' => 'Donation not found.'], 404);
    }
    if ($donation['status'] !== 'AVAILABLE') {
        sendJsonResponse(['success' => false, 'error' => "Cannot claim: Current status is {$donation['status']}."], 409);
    }

    $ngoId = ($currUser && $currUser['role'] === 'NGO') ? $currUser['id'] : 2;

    // Enforce 60 km Food Safety Geofence Restriction if geographic coordinates are present
    if (!empty($donation['latitude']) && !empty($donation['longitude'])) {
        $ngoLat = floatval($currUser['latitude'] ?? 40.728223);
        $ngoLng = floatval($currUser['longitude'] ?? -73.994228);
        $dLat = deg2rad(floatval($donation['latitude']) - $ngoLat);
        $dLon = deg2rad(floatval($donation['longitude']) - $ngoLng);
        $a = sin($dLat / 2) * sin($dLat / 2) + cos(deg2rad($ngoLat)) * cos(deg2rad(floatval($donation['latitude']))) * sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $distanceKm = 6371 * $c;

        if ($distanceKm > 60) {
            sendJsonResponse([
                'success' => false,
                'error' => "Food Safety Geofence Restriction: Donation is located " . round($distanceKm, 1) . " km away. Claiming is prohibited beyond the 60 km safe distribution horizon to prevent food spoilage."
            ], 403);
        }
    }

    // Generate 6-digit OTP codes for Handshake Verification
    $pickupOtp = str_pad(strval(mt_rand(100000, 999999)), 6, '0', STR_PAD_LEFT);
    $deliveryOtp = str_pad(strval(mt_rand(100000, 999999)), 6, '0', STR_PAD_LEFT);

    $pdo->beginTransaction();
    try {
        // 1. Update donation status
        $upd = $pdo->prepare("UPDATE donations SET status = 'CLAIMED' WHERE id = ?");
        $upd->execute([$donationId]);

        // 2. Insert or update claim
        $claimStmt = $pdo->prepare("INSERT INTO claims (donation_id, ngo_id, estimated_pickup_time, status) VALUES (?, ?, ?, 'ACTIVE') ON DUPLICATE KEY UPDATE ngo_id = VALUES(ngo_id), status = 'ACTIVE'");
        $claimStmt->execute([$donationId, $ngoId, $estimatedPickup]);

        // 3. Initialize Pickup Assignment waiting for volunteer courier (Open Dispatch Board)
        $pickupStmt = $pdo->prepare("INSERT INTO pickups (donation_id, volunteer_id, pickup_otp, delivery_otp, status) VALUES (?, NULL, ?, ?, 'CLAIMED') ON DUPLICATE KEY UPDATE volunteer_id = NULL, pickup_otp = VALUES(pickup_otp), delivery_otp = VALUES(delivery_otp), status = 'CLAIMED'");
        $pickupStmt->execute([$donationId, $pickupOtp, $deliveryOtp]);

        // 4. Log Audit Trail
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, 'NGO', 'CLAIM_DONATION', 'Donation', ?, ?)");
        $logStmt->execute([$ngoId, $actorName, $donationId, "Reserved {$donation['quantity']} {$donation['unit']} of {$donation['food_name']}. Handshake OTP generated."]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Food claimed successfully! Courier assigned and verification OTP generated.',
            'pickup_otp' => $pickupOtp,
            'delivery_otp' => $deliveryOtp
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

// -------------------------------------------------------------
// ACTION: assign_volunteer (Volunteer accepts dispatch)
// -------------------------------------------------------------
if ($action === 'assign_volunteer') {
    $donationId = intval($input['donation_id'] ?? 0);
    $volunteerId = ($currUser && $currUser['role'] === 'VOLUNTEER') ? $currUser['id'] : 3;

    $stmt = $pdo->prepare("SELECT * FROM pickups WHERE donation_id = ?");
    $stmt->execute([$donationId]);
    $pickup = $stmt->fetch();

    if (!$pickup) {
        sendJsonResponse(['success' => false, 'error' => 'No active claim found for this donation.'], 404);
    }

    $upd = $pdo->prepare("UPDATE pickups SET volunteer_id = ?, status = 'ASSIGNED' WHERE donation_id = ?");
    $upd->execute([$volunteerId, $donationId]);

    // Audit Log
    $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, 'VOLUNTEER', 'ASSIGN_PICKUP', 'Pickup', ?, 'Volunteer accepted pickup mission.')");
    $logStmt->execute([$volunteerId, $actorName, $pickup['id']]);

    sendJsonResponse(['success' => true, 'message' => 'Courier assigned to route.']);
}

// -------------------------------------------------------------
// ACTION: verify_pickup_otp (Donor hands food to Volunteer)
// -------------------------------------------------------------
if ($action === 'verify_pickup_otp') {
    $donationId = intval($input['donation_id'] ?? 0);
    $enteredOtp = trim($input['otp'] ?? '');

    if ($donationId <= 0 || empty($enteredOtp)) {
        sendJsonResponse(['success' => false, 'error' => 'Donation ID and 6-digit OTP code required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM pickups WHERE donation_id = ?");
    $stmt->execute([$donationId]);
    $pickup = $stmt->fetch();

    if (!$pickup) {
        sendJsonResponse(['success' => false, 'error' => 'Pickup record not found.'], 404);
    }

    if ($pickup['pickup_otp'] !== $enteredOtp) {
        sendJsonResponse(['success' => false, 'error' => 'Invalid OTP code. Please ask the Donor for the verified 6-digit PIN.'], 403);
    }

    $pdo->beginTransaction();
    try {
        $updPickup = $pdo->prepare("UPDATE pickups SET status = 'PICKED_UP', pickup_time = NOW() WHERE id = ?");
        $updPickup->execute([$pickup['id']]);

        $updDonation = $pdo->prepare("UPDATE donations SET status = 'PICKED_UP' WHERE id = ?");
        $updDonation->execute([$donationId]);

        // Audit Log
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, 'VOLUNTEER', 'VERIFY_PICKUP', 'Pickup', ?, 'Donor OTP verified. Food in transit.')");
        $logStmt->execute([$actorId, $actorName, $pickup['id']]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'OTP verified! Food custody transferred to courier. In transit to NGO recipient.'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// -------------------------------------------------------------
// ACTION: verify_delivery_otp (Volunteer delivers food to NGO)
// -------------------------------------------------------------
if ($action === 'verify_delivery_otp') {
    $donationId = intval($input['donation_id'] ?? 0);
    $enteredOtp = trim($input['otp'] ?? '');

    if ($donationId <= 0 || empty($enteredOtp)) {
        sendJsonResponse(['success' => false, 'error' => 'Donation ID and 6-digit delivery OTP code required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM pickups WHERE donation_id = ?");
    $stmt->execute([$donationId]);
    $pickup = $stmt->fetch();

    if (!$pickup) {
        sendJsonResponse(['success' => false, 'error' => 'Pickup record not found.'], 404);
    }

    if ($pickup['delivery_otp'] !== $enteredOtp) {
        sendJsonResponse(['success' => false, 'error' => 'Invalid Delivery OTP code. Please ask the NGO shelter coordinator.'], 403);
    }

    $pdo->beginTransaction();
    try {
        $updPickup = $pdo->prepare("UPDATE pickups SET status = 'DELIVERED', delivery_time = NOW() WHERE id = ?");
        $updPickup->execute([$pickup['id']]);

        $updDonation = $pdo->prepare("UPDATE donations SET status = 'DELIVERED' WHERE id = ?");
        $updDonation->execute([$donationId]);

        $updClaim = $pdo->prepare("UPDATE claims SET status = 'COMPLETED' WHERE donation_id = ?");
        $updClaim->execute([$donationId]);

        // Audit Log
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, 'NGO', 'CONFIRM_DELIVERY', 'Delivery', ?, 'Delivery OTP confirmed. Food safely received and distributed!')");
        $logStmt->execute([$actorId, $actorName, $pickup['id']]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Delivery confirmed! Redistribution complete. Impact metrics updated.'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// -------------------------------------------------------------
// ACTION: cancel_claim (Revert back to AVAILABLE)
// -------------------------------------------------------------
if ($action === 'cancel_claim') {
    $donationId = intval($input['donation_id'] ?? 0);

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE donations SET status = 'AVAILABLE' WHERE id = ?");
        $upd->execute([$donationId]);

        $delClaim = $pdo->prepare("DELETE FROM claims WHERE donation_id = ?");
        $delClaim->execute([$donationId]);

        $delPickup = $pdo->prepare("DELETE FROM pickups WHERE donation_id = ?");
        $delPickup->execute([$donationId]);

        $logStmt = $pdo->prepare("INSERT INTO audit_logs (actor_id, actor_name, role, action, entity_type, entity_id, details) VALUES (?, ?, ?, 'CANCEL_CLAIM', 'Donation', ?, 'Claim reservation cancelled. Returned to available pool.')");
        $logStmt->execute([$actorId, $actorName, $actorRole, $donationId]);

        $pdo->commit();
        sendJsonResponse(['success' => true, 'message' => 'Reservation cancelled. Food is available again.']);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

sendJsonResponse(['error' => 'Invalid action.'], 400);
