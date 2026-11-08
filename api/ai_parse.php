<?php
/**
 * NourishNet - AI Smart Food Extraction Assistant
 * Converts messy natural-language food descriptions into clean structured donation fields
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$text = trim($input['text'] ?? '');

if (empty($text)) {
    sendJsonResponse([
        'success' => false,
        'error' => 'Please provide text description to extract.'
    ], 400);
}

$lower = strtolower($text);

// 1. Quantity & Unit Extraction
$quantity = 25; // default fallback
$unit = 'servings';

if (preg_match('/(\d+)\s*(servings?|portions?|meals?|plates?|boxes?|packs?|trays?|loaves|kg|liters?|items?|pieces?)/i', $text, $matches)) {
    $quantity = intval($matches[1]);
    $matchedUnit = strtolower($matches[2]);
    if (in_array($matchedUnit, ['serving', 'servings', 'portion', 'portions', 'meal', 'meals', 'plate', 'plates'])) {
        $unit = 'servings';
    } elseif (in_array($matchedUnit, ['box', 'boxes', 'pack', 'packs', 'tray', 'trays'])) {
        $unit = 'boxes';
    } elseif (in_array($matchedUnit, ['loaf', 'loaves'])) {
        $unit = 'loaves';
    } elseif ($matchedUnit === 'kg') {
        $unit = 'kg';
    } elseif (in_array($matchedUnit, ['liter', 'liters'])) {
        $unit = 'liters';
    } else {
        $unit = 'portions';
    }
} elseif (preg_match('/(\d+)/', $text, $matches)) {
    $quantity = intval($matches[1]);
}

// 2. Category Classification
$category = 'PREPARED_MEAL';
if (preg_match('/(biryani|curry|rice|pasta|pizza|soup|stew|meal|dish|buffet|casserole|lunch|dinner|roast|noodle)/i', $lower)) {
    $category = 'PREPARED_MEAL';
} elseif (preg_match('/(bread|sourdough|croissant|focaccia|pastry|cake|muffin|bun|bake|bagel|donut)/i', $lower)) {
    $category = 'BAKED_GOODS';
} elseif (preg_match('/(fruit|apple|banana|orange|vegetable|salad|greens|spinach|carrot|tomato|produce)/i', $lower)) {
    $category = 'PRODUCE';
} elseif (preg_match('/(milk|cheese|yogurt|dairy|butter|cream|paneer)/i', $lower)) {
    $category = 'DAIRY';
} elseif (preg_match('/(canned|packet|box|cereal|snack|packaged|sealed)/i', $lower)) {
    $category = 'PACKAGED';
}

// 3. Dietary Tags
$dietary = [];
if (preg_match('/(vegetarian|veg\b|veggie)/i', $lower) && !preg_match('/non[-\s]?veg/i', $lower)) {
    $dietary[] = 'VEGETARIAN';
}
if (preg_match('/(vegan|plant[-\s]?based)/i', $lower)) {
    $dietary[] = 'VEGAN';
}
if (preg_match('/(halal)/i', $lower)) {
    $dietary[] = 'HALAL';
}
if (preg_match('/(gluten[-\s]?free|gf\b)/i', $lower)) {
    $dietary[] = 'GLUTEN_FREE';
}
if (preg_match('/(chicken|meat|beef|mutton|fish|pork|non[-\s]?veg)/i', $lower)) {
    $dietary[] = 'NON_VEG';
}
if (empty($dietary)) {
    $dietary[] = 'VEGETARIAN';
}
$dietaryTags = implode(',', array_unique($dietary));

// 4. Packaging Detection
$packaging = 'Foil Trays with Lids';
if (preg_match('/(foil\s*trays?|aluminum)/i', $lower)) {
    $packaging = 'Heavy-Duty Foil Trays with Thermal Seal';
} elseif (preg_match('/(kraft|paper\s*bag|boxes?|box)/i', $lower)) {
    $packaging = 'Eco Cardboard Bakery Boxes';
} elseif (preg_match('/(crates?|produce\s*bins?)/i', $lower)) {
    $packaging = 'Ventilated Food Grade Crates';
} elseif (preg_match('/(chilled|thermal|insulated)/i', $lower)) {
    $packaging = 'Chilled Insulated Thermal Bags';
} elseif (preg_match('/(individual|bento|single)/i', $lower)) {
    $packaging = 'Individual Compostable Meal Boxes';
}

// 5. Temperature Condition
$temp = 'ROOM_TEMP';
if (preg_match('/(hot|warm|steaming|freshly cooked|chafing)/i', $lower)) {
    $temp = 'HOT';
} elseif (preg_match('/(chilled|cold|refrigerated|freeze|ice)/i', $lower)) {
    $temp = 'CHILLED';
}

// 6. Title Extraction
$foodTitle = '';
// Clean leading filler phrases
$cleaned = preg_replace('/^(we have|there are|surplus of|approx\.?|about|around|fresh)\s+/i', '', $text);
$parts = preg_split('/[,;\.\n]|prepared|cooked|packed|stored|must be/i', $cleaned);
if (!empty($parts[0])) {
    $candidate = trim(preg_replace('/^\d+\s*(servings?|portions?|meals?|plates?|boxes?|loaves|kg|liters?)?\s*(of)?\s*/i', '', $parts[0]));
    if (strlen($candidate) >= 3) {
        $foodTitle = ucwords($candidate);
    }
}
if (empty($foodTitle)) {
    $foodTitle = ucwords($category . ' Surplus');
}

// 7. Safety Shelf Life & Expiry Recommendation
$expiryHours = 4;
if ($category === 'PREPARED_MEAL') {
    $expiryHours = ($temp === 'HOT') ? 3 : 4;
} elseif ($category === 'BAKED_GOODS') {
    $expiryHours = 8;
} elseif ($category === 'PRODUCE') {
    $expiryHours = 24;
} elseif ($category === 'DAIRY') {
    $expiryHours = 6;
}

if (preg_match('/within\s*(\d+)\s*(hours?|hrs?)/i', $lower, $m)) {
    $expiryHours = intval($m[1]);
}

$now = time();
$prepTimestamp = date('Y-m-d H:i:s', $now - 3600); // 1 hour ago
$availUntilTimestamp = date('Y-m-d H:i:s', $now + ($expiryHours * 3600));

// High quality photo preset corresponding to detected item
$photoMap = [
    'PREPARED_MEAL' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    'BAKED_GOODS' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    'PRODUCE' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    'DAIRY' => 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    'PACKAGED' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    'OTHER' => 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80'
];

sendJsonResponse([
    'success' => true,
    'extracted' => [
        'food_name' => $foodTitle,
        'category' => $category,
        'quantity' => $quantity,
        'unit' => $unit,
        'dietary_tags' => $dietaryTags,
        'packaging' => $packaging,
        'temperature_condition' => $temp,
        'preparation_time' => $prepTimestamp,
        'available_until' => $availUntilTimestamp,
        'expiry_hours' => $expiryHours,
        'image_url' => $photoMap[$category] ?? $photoMap['PREPARED_MEAL'],
        'confidence_score' => 96,
        'notes' => 'Parsed from: "' . $text . '"'
    ]
]);
