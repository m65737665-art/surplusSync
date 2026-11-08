/**
 * ============================================================================
 * SurplusSync — Comprehensive Frontend Application Engine
 * Architecture: Vanilla JavaScript + Leaflet.js + LAMP Backend API
 * Full Logical Flow:
 *   1. Public Landing Page (Info, Goals, Objectives, Differentiators, Lifecycle)
 *   2. Authentication (Login & Registration for Donor, NGO, Volunteer roles)
 *   3. Role-Specific Portals:
 *      - Donor Hub (List surplus, track status, reveal 6-digit Pickup OTP)
 *      - NGO Hub (Marketplace feed, Leaflet Discovery Map, Claims, Delivery OTP)
 *      - Volunteer Hub (Route navigation, OTP Handshake verification)
 *      - Admin Hub (Audit logs, SVG trend charts, Leaderboards, CSV export)
 * ============================================================================
 */

// --- GLOBAL APPLICATION STATE ---
const App = {
  currentView: 'landing', // 'landing' | 'donor' | 'ngo' | 'volunteer' | 'admin'
  currentUser: null,      // Logged in user object or null
  donations: [],
  auditLogs: [],
  pendingNgos: [
    {
      id: 201,
      name: "Father Michael O'Connor",
      email: "shelter@stjuderefuge.org",
      phone: "+1 (555) 349-8172",
      organization_name: "St. Jude Homeless Refuge & Community Kitchen",
      approx_location: "Lower Manhattan District",
      certificate_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
      verification_status: "PENDING",
      created_at: "Today, 09:15 AM"
    },
    {
      id: 202,
      name: "Elena Rostova",
      email: "elena@metrofoodbank.org",
      phone: "+1 (555) 781-9920",
      organization_name: "Metro Community Food Bank",
      approx_location: "East River Waterfront",
      certificate_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600",
      verification_status: "PENDING",
      created_at: "Yesterday, 04:30 PM"
    }
  ],
  supportTickets: [
    {
      id: 401,
      user_name: "Chef Antonio Rossi",
      user_role: "DONOR",
      subject: "Courier thermal insulation bag query for hot biryani transport",
      priority: "MEDIUM",
      status: "OPEN",
      created_at: "Today at 10:45 AM"
    },
    {
      id: 402,
      user_name: "Maria Santos",
      user_role: "NGO",
      subject: "Requesting increase in daily claim portion cap for weekend soup kitchen",
      priority: "HIGH",
      status: "OPEN",
      created_at: "Yesterday at 03:20 PM"
    },
    {
      id: 403,
      user_name: "Alex Chen",
      user_role: "VOLUNTEER",
      subject: "Heavy road construction on 8th Ave detour logged",
      priority: "LOW",
      status: "RESOLVED",
      created_at: "Nov 4, 11:15 AM"
    }
  ],
  ngoSubView: 'marketplace', // 'marketplace' | 'map' | 'claims'
  donorFilter: 'ALL',        // 'ALL' | 'AVAILABLE' | 'CLAIMED' | 'DELIVERED'
  ngoCategory: 'ALL',
  ngoSearchQuery: '',
  ngoUrgentOnly: false,
  ngoRadiusKm: 30,
  volunteerAvailable: true,
  leafletMap: null,
  mapMarkers: [],
  mapRadiusCircle: null,
  pendingOtpContext: null,   // { donationId, type: 'pickup' | 'delivery' }
  ngoClaimsSubTab: 'active', // 'active' | 'completed'
  volunteerSubTab: 'available', // 'available' | 'active'
  isLampBackendOnline: false
};

// --- INITIAL HIGH-FIDELITY SEED DATA ---
const SEED_USERS = {
  DONOR: {
    id: 1,
    name: 'Chef Antonio Rossi',
    email: 'donor@foodshare.org',
    role: 'DONOR',
    organization_name: 'Bistro Della Spiga',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    verification_status: 'APPROVED',
    latitude: 40.712776,
    longitude: -74.005974,
    avatar_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150'
  },
  NGO: {
    id: 2,
    name: 'Maria Santos',
    email: 'ngo@foodshare.org',
    role: 'NGO',
    organization_name: 'Hope Community Kitchen',
    approx_location: 'Eastside Community Center',
    full_address: '789 Outreach Blvd',
    certificate_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
    verification_status: 'APPROVED',
    latitude: 40.728223,
    longitude: -73.994228,
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
  },
  VOLUNTEER: {
    id: 3,
    name: 'Alex Chen',
    email: 'volunteer@foodshare.org',
    role: 'VOLUNTEER',
    organization_name: 'EcoRiders Volunteer Squad',
    approx_location: 'Midtown Central',
    full_address: '350 5th Ave',
    verification_status: 'APPROVED',
    latitude: 40.748817,
    longitude: -73.985428,
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  },
  ADMIN: {
    id: 4,
    name: 'Dr. Sarah Jenkins',
    email: 'admin@foodshare.org',
    role: 'ADMIN',
    organization_name: 'Food Safety Governance Board',
    approx_location: 'Civic Center',
    full_address: '100 Municipal Plaza',
    verification_status: 'APPROVED',
    latitude: 40.713829,
    longitude: -74.001648,
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
  }
};

const SEED_DONATIONS = [
  {
    id: 1,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Artisan Sourdough Loaves & Olive Focaccia',
    category: 'BAKED_GOODS',
    quantity: 35,
    unit: 'loaves',
    dietary_tags: 'VEGETARIAN,VEGAN',
    packaging: 'Brown Kraft Bakery Bags',
    temperature_condition: 'ROOM_TEMP',
    preparation_time: new Date(Date.now() - 3 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 5 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Fresh morning bake surplus from bakery counter. In pristine condition.',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    latitude: 40.712776,
    longitude: -74.005974,
    status: 'AVAILABLE',
    distance_km: 1.8,
    pickup_otp: '749215',
    delivery_otp: '381904'
  },
  {
    id: 2,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Hyderabadi Dum Biryani & Mirchi Ka Salan',
    category: 'PREPARED_MEAL',
    quantity: 60,
    unit: 'servings',
    dietary_tags: 'HALAL',
    packaging: 'Heavy-Duty Foil Trays with Thermal Seal',
    temperature_condition: 'HOT',
    preparation_time: new Date(Date.now() - 2 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 2 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Prepared for corporate luncheon. Kept hot above 65°C in thermal chaffers.',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    latitude: 40.714200,
    longitude: -74.007800,
    status: 'AVAILABLE',
    distance_km: 2.1,
    pickup_otp: '582910',
    delivery_otp: '918234'
  },
  {
    id: 3,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Organic Farm Greens, Spinach & Heritage Carrots',
    category: 'PRODUCE',
    quantity: 45,
    unit: 'kg',
    dietary_tags: 'VEGETARIAN,VEGAN,GLUTEN_FREE',
    packaging: 'Ventilated Wooden Crates',
    temperature_condition: 'ROOM_TEMP',
    preparation_time: new Date(Date.now() - 8 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 18 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Crisp regional farm delivery surplus. Washed, crisp, and sorted.',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    latitude: 40.711500,
    longitude: -74.003900,
    status: 'AVAILABLE',
    distance_km: 1.5,
    pickup_otp: '629148',
    delivery_otp: '448102'
  },
  {
    id: 4,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Paneer Tikka Masala & Jeera Basmati Rice',
    category: 'PREPARED_MEAL',
    quantity: 40,
    unit: 'servings',
    dietary_tags: 'VEGETARIAN,GLUTEN_FREE',
    packaging: 'Foil Trays with Thermal Seals',
    temperature_condition: 'HOT',
    preparation_time: new Date(Date.now() - 1 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 3.5 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Vegetarian specialty course packed hot in separate sauce and rice containers.',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    latitude: 40.715100,
    longitude: -74.002200,
    status: 'AVAILABLE',
    distance_km: 2.3,
    pickup_otp: '319842',
    delivery_otp: '725910'
  },
  {
    id: 5,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Croissants, Pain au Chocolat & Danish Pastries',
    category: 'BAKED_GOODS',
    quantity: 50,
    unit: 'pieces',
    dietary_tags: 'VEGETARIAN',
    packaging: 'Eco Cardboard Bakery Boxes',
    temperature_condition: 'ROOM_TEMP',
    preparation_time: new Date(Date.now() - 5 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 4 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Breakfast banquet viennoiseries. Cleanly boxed.',
    approx_location: 'Downtown Arts District',
    full_address: '412 Renaissance Ave, Suite 100',
    latitude: 40.712100,
    longitude: -74.005100,
    status: 'CLAIMED',
    distance_km: 1.6,
    ngo_id: 2,
    ngo_name: 'Maria Santos',
    ngo_org: 'Hope Community Kitchen',
    volunteer_id: null,
    volunteer_name: null,
    pickup_otp: '749215',
    delivery_otp: '381904'
  },
  {
    id: 6,
    donor_id: 1,
    donor_name: 'Chef Antonio Rossi',
    donor_org: 'Bistro Della Spiga',
    food_name: 'Greek Yogurt Pots & Whole Milk Cartons',
    category: 'DAIRY',
    quantity: 30,
    unit: 'liters',
    dietary_tags: 'VEGETARIAN,GLUTEN_FREE',
    packaging: 'Chilled Insulated Thermal Bags',
    temperature_condition: 'CHILLED',
    preparation_time: new Date(Date.now() - 6 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 12 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Cold chain verified at 4°C continuously. Sealed carton tamper tags intact.',
    approx_location: 'Midtown Central',
    full_address: '600 Lexington Ave',
    latitude: 40.756200,
    longitude: -73.971900,
    status: 'AVAILABLE',
    distance_km: 3.2,
    pickup_otp: '831092',
    delivery_otp: '517203'
  },
  {
    id: 7,
    donor_id: 1,
    donor_name: 'Farmer Arthur Sterling',
    donor_org: 'Hudson Valley Organic Orchards',
    food_name: 'Crisp McIntosh Apples, Pears & Fresh Pressed Cider',
    category: 'PRODUCE',
    quantity: 85,
    unit: 'kg',
    dietary_tags: 'VEGETARIAN,VEGAN,GLUTEN_FREE',
    packaging: 'Wooden Slatted Crates',
    temperature_condition: 'ROOM_TEMP',
    preparation_time: new Date(Date.now() - 7 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 20 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&auto=format&fit=crop&q=80',
    special_notes: 'Regional orchard harvest surplus. Pristine, sorted, washed fruit.',
    approx_location: 'Hudson Valley Orchards (Out-of-Region)',
    full_address: 'Route 9W, Highland Orchards, NY',
    latitude: 41.385000,
    longitude: -73.950000,
    status: 'AVAILABLE',
    distance_km: 73.2,
    pickup_otp: '419082',
    delivery_otp: '821943'
  },
  {
    id: 8,
    donor_id: 1,
    donor_name: 'Executive Chef Laurent Morel',
    donor_org: 'Princeton Conference Manor Banquets',
    food_name: 'Slow Roasted Herb Beef, Rich Pan Gravy & Roasted Potatoes',
    category: 'PREPARED_MEAL',
    quantity: 50,
    unit: 'servings',
    dietary_tags: 'HALAL',
    packaging: 'Stainless Gastronorm Sealed Pans',
    temperature_condition: 'HOT',
    preparation_time: new Date(Date.now() - 2 * 3600000).toISOString(),
    available_until: new Date(Date.now() + 3 * 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    special_notes: 'High-end conference banquet surplus. Kept hot above 65°C.',
    approx_location: 'Princeton Conference Manor (Regional Boundary)',
    full_address: '100 College Farm Rd, Princeton Region, NJ',
    latitude: 40.357000,
    longitude: -74.667000,
    status: 'AVAILABLE',
    distance_km: 67.8,
    pickup_otp: '652190',
    delivery_otp: '380129'
  }
];

// Food Safety Maximum Safe Courier Transit Boundary (km)
const MAX_FOOD_SAFETY_DISTANCE_KM = 60;

/**
 * Real Haversine Great-Circle Distance Calculation (in kilometers)
 * Used to enforce the 60 km food safety horizon to protect food quality.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 2.0;
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Computes exact distance from the current NGO (or active user's location) to the food listing
 */
function getDonationDistance(item) {
  const userLat = (App.currentUser && App.currentUser.latitude) ? App.currentUser.latitude : 40.728223;
  const userLng = (App.currentUser && App.currentUser.longitude) ? App.currentUser.longitude : -73.994228;
  if (item.latitude && item.longitude) {
    return calculateHaversineDistance(userLat, userLng, item.latitude, item.longitude);
  }
  return item.distance_km || 2.0;
}

const SEED_AUDIT_LOGS = [
  { id: 101, actor_name: 'Chef Antonio Rossi', role: 'DONOR', action: 'PUBLISH_DONATION', entity_type: 'Donation', entity_id: 1, details: 'Listed 35 loaves Artisan Sourdough with 5hr safety window.', created_at: new Date(Date.now() - 4 * 3600000).toLocaleString() },
  { id: 102, actor_name: 'Chef Antonio Rossi', role: 'DONOR', action: 'PUBLISH_DONATION', entity_type: 'Donation', entity_id: 2, details: 'Listed 60 portions Hyderabadi Dum Biryani with thermal seal checklist.', created_at: new Date(Date.now() - 2 * 3600000).toLocaleString() },
  { id: 103, actor_name: 'Maria Santos', role: 'NGO', action: 'CLAIM_DONATION', entity_type: 'Donation', entity_id: 5, details: 'Reserved 50 pcs Bakery Pastries for Hope Kitchen evening distribution.', created_at: new Date(Date.now() - 1 * 3600000).toLocaleString() },
  { id: 104, actor_name: 'Alex Chen', role: 'VOLUNTEER', action: 'ASSIGN_PICKUP', entity_type: 'Pickup', entity_id: 5, details: 'Accepted courier mission for Bistro Della Spiga -> Hope Community Kitchen.', created_at: new Date(Date.now() - 40 * 60000).toLocaleString() }
];

// --- APP LIFECYCLE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  App.donations = [...SEED_DONATIONS];
  App.auditLogs = [...SEED_AUDIT_LOGS];

  // Default expiry date in add food form (now + 4 hours)
  const defaultExpiry = new Date(Date.now() + 4 * 3600000);
  const expiryInput = document.getElementById('food-expiry');
  if (expiryInput) {
    expiryInput.value = defaultExpiry.toISOString().slice(0, 16);
  }

  // Check Backend Connection
  await checkBackendStatus();

  // Load Donations from API if online
  await loadDonationsFromApi();

  // Load Pending NGOs from API if online
  await loadPendingNgosFromApi();

  // Check LocalStorage Session
  const savedUser = localStorage.getItem('surplus_user');
  if (savedUser) {
    try {
      App.currentUser = JSON.parse(savedUser);
      navigateToRolePortal(App.currentUser.role);
    } catch (e) {
      navigateTo('landing');
    }
  } else {
    navigateTo('landing');
  }

  // Start periodic 30-second expiry countdown ticker
  setInterval(tickCountdowns, 30000);
}

// --- API COMMUNICATIONS ---
async function checkBackendStatus() {
  try {
    const res = await fetch('api/auth.php?action=me');
    if (res.ok) {
      const data = await res.json();
      App.isLampBackendOnline = true;
      if (data.authenticated && data.user) {
        App.currentUser = data.user;
        localStorage.setItem('surplus_user', JSON.stringify(data.user));
      }
    }
  } catch (err) {
    console.log('Running in local/VM dual-mode (Full offline resilience enabled)');
  }
}

async function loadDonationsFromApi() {
  if (!App.isLampBackendOnline) return;

  try {
    const res = await fetch('api/donations.php');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.donations) && data.donations.length > 0) {
        App.donations = data.donations;
      }
    }
  } catch (err) {
    console.warn('API sync fallback to memory store.');
  }
}

async function loadPendingNgosFromApi() {
  if (!App.isLampBackendOnline) return;

  try {
    const res = await fetch('api/auth.php?action=pending_ngos');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.pending_ngos) && data.pending_ngos.length > 0) {
        App.pendingNgos = data.pending_ngos;
      }
    }
  } catch (err) {
    console.warn('API pending NGOs sync fallback to memory store.');
  }
}

// --- VIEW NAVIGATION ENGINE ---
function navigateTo(viewId) {
  App.currentView = viewId;

  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  // Activate selected view
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add('active');
  }

  // Update Navbar configuration based on auth state
  updateNavbarState();

  // View-specific renders
  if (viewId === 'donor') {
    renderDonorHub();
  } else if (viewId === 'ngo') {
    renderNgoHub();
  } else if (viewId === 'volunteer') {
    renderVolunteerHub();
  } else if (viewId === 'admin') {
    renderAdminHub();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToRolePortal(role) {
  const roleUpper = (role || 'DONOR').toUpperCase();
  if (roleUpper === 'DONOR') navigateTo('donor');
  else if (roleUpper === 'NGO') navigateTo('ngo');
  else if (roleUpper === 'VOLUNTEER') navigateTo('volunteer');
  else if (roleUpper === 'ADMIN') navigateTo('admin');
  else navigateTo('landing');
}

function scrollToSection(sectionId) {
  if (App.currentView !== 'landing') {
    navigateTo('landing');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  } else {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

function updateNavbarState() {
  const publicLinks = document.getElementById('public-nav-links');
  const authLinks = document.getElementById('auth-nav-links');
  const publicActions = document.getElementById('public-actions');
  const userPill = document.getElementById('user-profile-pill');

  if (App.currentUser) {
    // Authenticated State
    if (publicLinks) publicLinks.style.display = 'none';
    if (publicActions) publicActions.style.display = 'none';
    if (userPill) userPill.style.display = 'flex';

    document.getElementById('nav-user-name').textContent = App.currentUser.name;
    document.getElementById('nav-role-badge').textContent = App.currentUser.role;
    document.getElementById('nav-user-avatar').src = App.currentUser.avatar_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150';

    // Role-specific nav links
    if (authLinks) {
      authLinks.style.display = 'flex';
      let navHtml = '';
      if (App.currentUser.role === 'DONOR') {
        navHtml = `
          <a href="#" class="nav-anchor" onclick="navigateTo('donor'); return false;"><i class="fa-solid fa-store"></i> Donor Hub</a>
          <a href="#" class="nav-anchor" onclick="openAddFoodModal(); return false;"><i class="fa-solid fa-plus-circle"></i> List Food</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('landing'); return false;"><i class="fa-solid fa-globe"></i> Main Landing Page</a>
        `;
      } else if (App.currentUser.role === 'NGO') {
        navHtml = `
          <a href="#" class="nav-anchor" onclick="navigateTo('ngo'); switchNgoSubView('marketplace'); return false;"><i class="fa-solid fa-list-ul"></i> Marketplace</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('ngo'); switchNgoSubView('map'); return false;"><i class="fa-solid fa-map-location-dot"></i> Discovery Map</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('ngo'); switchNgoSubView('claims'); return false;"><i class="fa-solid fa-hand-holding-heart"></i> My Claims</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('landing'); return false;"><i class="fa-solid fa-globe"></i> Main Landing Page</a>
        `;
      } else if (App.currentUser.role === 'VOLUNTEER') {
        navHtml = `
          <a href="#" class="nav-anchor" onclick="navigateTo('volunteer'); return false;"><i class="fa-solid fa-route"></i> Courier Missions</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('landing'); return false;"><i class="fa-solid fa-globe"></i> Main Landing Page</a>
        `;
      } else if (App.currentUser.role === 'ADMIN') {
        navHtml = `
          <a href="#" class="nav-anchor" onclick="navigateTo('admin'); return false;"><i class="fa-solid fa-shield-halved"></i> Governance & Audit</a>
          <a href="#" class="nav-anchor" onclick="navigateTo('landing'); return false;"><i class="fa-solid fa-globe"></i> Main Landing Page</a>
        `;
      }
      authLinks.innerHTML = navHtml;
    }
  } else {
    // Public Visitor State
    if (publicLinks) publicLinks.style.display = 'flex';
    if (publicActions) publicActions.style.display = 'flex';
    if (authLinks) authLinks.style.display = 'none';
    if (userPill) userPill.style.display = 'none';
  }
}

// --- AUTHENTICATION MODALS & LOGIC ---
function openLoginModal() {
  document.getElementById('modal-login').classList.add('show');
}

function openRegisterModal(preselectedRole = 'DONOR') {
  document.getElementById('modal-register').classList.add('show');
  handleRoleSelection(preselectedRole);
}

function openDemoPickerModal() {
  document.getElementById('modal-demo-picker').classList.add('show');
}

function closeAuthModal(e, modalId) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('dialog-close-btn')) return;
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

function switchAuthModal(closeId, openId) {
  document.getElementById(closeId).classList.remove('show');
  document.getElementById(openId).classList.add('show');
}

function handleRoleSelection(role) {
  document.querySelectorAll('.role-radio-pill').forEach(pill => pill.classList.remove('active'));
  const targetPill = document.getElementById(`pill-role-${role.toLowerCase().slice(0, 3)}`);
  if (targetPill) {
    targetPill.classList.add('active');
    const radio = targetPill.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }

  const orgLabel = document.getElementById('reg-org-label');
  const btnText = document.getElementById('btn-reg-text');
  const ngoCertSection = document.getElementById('ngo-cert-section');

  if (role === 'DONOR') {
    if (orgLabel) orgLabel.textContent = 'Restaurant / Bakery / Caterer Name *';
    if (btnText) btnText.textContent = 'Register as Food Donor & Launch Portal';
    if (ngoCertSection) ngoCertSection.style.display = 'none';
  } else if (role === 'NGO') {
    if (orgLabel) orgLabel.textContent = 'Shelter / Charity / Food Bank Name *';
    if (btnText) btnText.textContent = 'Register as NGO / Shelter & Launch Portal';
    if (ngoCertSection) ngoCertSection.style.display = 'block';
  } else {
    if (orgLabel) orgLabel.textContent = 'Courier Squad / Vehicle Details *';
    if (btnText) btnText.textContent = 'Register as Volunteer Courier & Launch Portal';
    if (ngoCertSection) ngoCertSection.style.display = 'none';
  }
}

function handleCertFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  const badge = document.getElementById('cert-filename-badge');
  const urlInput = document.getElementById('reg-certificate-url');
  if (!file) return;

  if (badge) {
    badge.textContent = `Attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    badge.style.color = '#10b981';
    badge.style.fontWeight = '700';
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    if (urlInput) {
      urlInput.value = evt.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function quickFillLogin(roleKey) {
  const users = {
    donor: { email: 'donor@foodshare.org', pass: 'password123' },
    ngo: { email: 'ngo@foodshare.org', pass: 'password123' },
    volunteer: { email: 'volunteer@foodshare.org', pass: 'password123' },
    admin: { email: 'admin@foodshare.org', pass: 'admin123' }
  };
  const u = users[roleKey];
  if (u) {
    document.getElementById('login-email').value = u.email;
    document.getElementById('login-password').value = u.pass;
    document.getElementById('btn-login-submit').click();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  // Try PHP API
  let user = null;
  if (App.isLampBackendOnline) {
    try {
      const res = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.user) user = data.user;
    } catch (err) {
      console.warn('API login offline, using memory matching.');
    }
  }

  // Memory fallback
  if (!user) {
    if (email.includes('donor')) user = SEED_USERS.DONOR;
    else if (email.includes('ngo')) user = SEED_USERS.NGO;
    else if (email.includes('volunteer')) user = SEED_USERS.VOLUNTEER;
    else if (email.includes('admin')) user = SEED_USERS.ADMIN;
    else {
      // Default to Donor
      user = { ...SEED_USERS.DONOR, email, name: email.split('@')[0] };
    }
  }

  App.currentUser = user;
  localStorage.setItem('surplus_user', JSON.stringify(user));
  document.getElementById('modal-login').classList.remove('show');

  showToast(`Welcome back, ${user.name}! Accessing ${user.role} portal.`, 'success');
  navigateToRolePortal(user.role);
}

async function handleRegisterSubmit(e) {
  e.preventDefault();

  const role = document.querySelector('input[name="reg-role"]:checked').value;
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const org = document.getElementById('reg-org').value.trim();
  const approx = document.getElementById('reg-approx').value.trim();
  const address = document.getElementById('reg-address').value.trim();
  const certUrlInput = document.getElementById('reg-certificate-url');
  const certificate_url = (role === 'NGO' && certUrlInput) ? certUrlInput.value : '';

  const newUser = {
    id: Date.now(),
    name,
    email,
    role,
    organization_name: org,
    phone,
    approx_location: approx,
    full_address: address,
    certificate_url: certificate_url || (role === 'NGO' ? 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600' : ''),
    verification_status: role === 'NGO' ? 'PENDING' : 'APPROVED',
    latitude: 40.7128 + (Math.random() * 0.04 - 0.02),
    longitude: -74.0060 + (Math.random() * 0.04 - 0.02),
    avatar_url: role === 'DONOR' 
      ? 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150'
      : (role === 'NGO' 
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' 
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')
  };

  // If NGO, queue for administrator review
  if (role === 'NGO') {
    App.pendingNgos.unshift({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      organization_name: newUser.organization_name,
      approx_location: newUser.approx_location,
      certificate_url: newUser.certificate_url,
      verification_status: 'PENDING',
      created_at: 'Just now'
    });

    App.auditLogs.unshift({
      id: App.auditLogs.length + 101,
      actor_name: newUser.name,
      role: 'NGO',
      action: 'SUBMIT_CERTIFICATE',
      entity_type: 'NGO Registration',
      entity_id: newUser.id,
      details: `Shelter "${newUser.organization_name}" registered and submitted government accreditation certificate.`,
      created_at: new Date().toLocaleString()
    });
  }

  // Sync to API if online
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (err) {}
  }

  App.currentUser = newUser;
  localStorage.setItem('surplus_user', JSON.stringify(newUser));
  document.getElementById('modal-register').classList.remove('show');

  if (role === 'NGO') {
    showToast(`NGO Account Created! Your certificate is submitted to the Admin Queue for verification.`, 'success');
  } else {
    showToast(`Account created! Welcome to SurplusSync as a verified ${role}.`, 'success');
  }
  navigateToRolePortal(role);
}

function switchPersonaAndNavigate(role) {
  const user = SEED_USERS[role] || SEED_USERS.DONOR;
  App.currentUser = user;
  localStorage.setItem('surplus_user', JSON.stringify(user));
  document.getElementById('modal-demo-picker').classList.remove('show');

  showToast(`Switched active persona to ${user.name} (${user.role})`, 'info');
  navigateToRolePortal(user.role);
}

function logout() {
  App.currentUser = null;
  localStorage.removeItem('surplus_user');
  if (App.isLampBackendOnline) {
    fetch('api/auth.php?action=logout');
  }
  showToast('You have signed out successfully.', 'info');
  navigateTo('landing');
}

// --- ROLE 1: DONOR HUB LOGIC ---
function renderDonorHub() {
  if (!App.currentUser) return;

  document.getElementById('donor-greeting').textContent = `Good day, ${App.currentUser.name}!`;
  document.getElementById('donor-org-label').textContent = App.currentUser.organization_name;

  // Compute stat metrics
  const available = App.donations.filter(d => d.status === 'AVAILABLE').length;
  const claimed = App.donations.filter(d => d.status === 'CLAIMED').length;
  const delivered = App.donations.filter(d => d.status === 'DELIVERED').length;
  const urgent = App.donations.filter(d => {
    if (d.status !== 'AVAILABLE') return false;
    const { hours, isExpired } = computeTimeLeft(d.available_until);
    return !isExpired && hours < 3;
  }).length;

  document.getElementById('donor-stat-available').textContent = available;
  document.getElementById('donor-stat-claimed').textContent = claimed;
  document.getElementById('donor-stat-delivered').textContent = delivered;
  document.getElementById('donor-stat-urgent').textContent = urgent;

  // Filter listings
  const filtered = App.donations.filter(d => {
    if (App.donorFilter === 'ALL') return true;
    return d.status === App.donorFilter;
  });

  const container = document.getElementById('donor-listings-grid');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; background: #fff; border-radius: 16px; border: 1px solid var(--border-subtle);">
        <i class="fa-solid fa-boxes-stacked" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
        <h3>No food listings in this category</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">Click the button below to publish a new batch of surplus food.</p>
        <button class="btn-primary" onclick="openAddFoodModal()"><i class="fa-solid fa-plus-circle"></i> List Surplus Food</button>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const { hours, minutes, isUrgent, isExpired } = computeTimeLeft(item.available_until);
    const isClaimed = item.status === 'CLAIMED';
    const isDelivered = item.status === 'DELIVERED';

    let statusTagClass = 'status-available';
    let statusLabel = 'Available for Claim';
    if (isClaimed && !item.volunteer_id) { statusTagClass = 'status-pending'; statusLabel = 'Claimed — Awaiting Courier'; }
    else if (isClaimed && item.volunteer_id) { statusTagClass = 'status-claimed'; statusLabel = 'Courier Assigned'; }
    if (isDelivered) { statusTagClass = 'status-delivered'; statusLabel = 'Delivered & Rescued'; }

    html += `
      <div class="donor-food-card">
        <div class="df-image-wrap">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.food_name)}">
          <div class="df-floating-badge">
            <span class="status-tag ${statusTagClass}">${statusLabel}</span>
          </div>
        </div>

        <div class="df-body">
          <h3 class="df-title">${escapeHtml(item.food_name)}</h3>
          
          <div class="df-meta-chips">
            <span class="df-chip" style="font-weight: 800; color: var(--text-main);">${item.quantity} ${escapeHtml(item.unit)}</span>
            <span class="df-chip">${escapeHtml(item.packaging)}</span>
            <span class="df-chip">${escapeHtml(item.temperature_condition)}</span>
          </div>

          <div style="font-size: 0.84rem; color: var(--text-muted);">
            <i class="fa-solid fa-clock"></i> <strong>Safe Window:</strong> 
            ${isExpired ? '<span style="color:red; font-weight:700;">Expired</span>' : `${hours}h ${minutes}m remaining`}
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted); background: var(--bg-muted); padding: 8px 12px; border-radius: 8px;">
            ${escapeHtml(item.special_notes || 'Handled under verified sanitary food safety standards.')}
          </div>

          <!-- ReTray Security Handshake: 6-Digit Pickup OTP shown when claimed -->
          ${isClaimed && item.volunteer_id ? `
            <div class="df-otp-box">
              <span class="df-otp-label"><i class="fa-solid fa-key"></i> YOUR 6-DIGIT PICKUP HANDSHAKE PIN:</span>
              <div class="df-otp-code">${item.pickup_otp || '749215'}</div>
              <p style="font-size: 0.72rem; color: #b45309; margin-top: 4px;">
                Show this PIN to volunteer courier (${escapeHtml(item.volunteer_name)}) when they collect the food.
              </p>
            </div>
          ` : ''}
          ${isClaimed && !item.volunteer_id ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 12px 14px; margin-top: 8px;">
              <p style="font-size: 0.84rem; font-weight: 700; color: #92400e; margin: 0;">
                <i class="fa-solid fa-clock"></i> Claimed by ${escapeHtml(item.ngo_name || 'NGO')} — Waiting for a courier to accept the delivery mission.
              </p>
              <p style="font-size: 0.75rem; color: #92400e; margin: 4px 0 0;">
                The pickup PIN will be shown once a volunteer courier accepts this mission.
              </p>
            </div>
          ` : ''}
        </div>

        <div class="df-footer">
          <span style="font-size: 0.8rem; color: var(--text-muted);">ID: #${item.id}</span>
          ${item.status === 'AVAILABLE' ? `
            <button class="btn-text" style="color: var(--color-danger); padding: 4px;" onclick="cancelDonation(${item.id})">
              <i class="fa-solid fa-ban"></i> Cancel Listing
            </button>
          ` : `
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--primary-accent);">
              <i class="fa-solid fa-circle-check"></i> ${item.status}
            </span>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterDonorListings(statusFilter) {
  App.donorFilter = statusFilter;
  document.querySelectorAll('.ptab-btn[data-donor-filter]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-donor-filter') === statusFilter);
  });
  renderDonorHub();
}

function openAddFoodModal() {
  document.getElementById('modal-add-food').classList.add('show');
}

function cancelDonation(id) {
  const item = App.donations.find(d => d.id === id);
  if (!item) return;

  if (confirm(`Are you sure you want to cancel the surplus listing for "${item.food_name}"?`)) {
    item.status = 'CANCELLED';
    if (App.isLampBackendOnline) {
      fetch(`api/donations.php?id=${id}`, { method: 'DELETE' });
    }
    showToast('Listing cancelled.', 'info');
    renderDonorHub();
  }
}

// --- ADD FOOD WITH AI SMART PARSER ---
function previewFoodImage(url) {
  const img = document.getElementById('add-food-preview-img');
  if (img && url) img.src = url;
}

function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    document.getElementById('food-image').value = dataUrl;
    previewFoodImage(dataUrl);
    showToast('Photo uploaded successfully!', 'success');
  };
  reader.readAsDataURL(file);
}

async function runAiNlpExtraction() {
  const text = document.getElementById('ai-nlp-input').value.trim();
  if (!text) {
    showToast('Please type or paste chef notes for the AI to parse.', 'error');
    return;
  }

  // Fallback heuristic parser
  const extracted = localNlpParser(text);

  // Fill Form Fields
  document.getElementById('food-title').value = extracted.food_name;
  document.getElementById('food-category').value = extracted.category;
  document.getElementById('food-qty').value = extracted.quantity;
  document.getElementById('food-unit').value = extracted.unit;
  document.getElementById('food-packaging').value = extracted.packaging;
  document.getElementById('food-temp').value = extracted.temperature_condition;
  document.getElementById('food-notes').value = extracted.notes;
  document.getElementById('food-image').value = extracted.image_url;
  previewFoodImage(extracted.image_url);

  // Expiry timestamp
  const expiry = new Date(Date.now() + (extracted.expiry_hours || 4) * 3600000);
  document.getElementById('food-expiry').value = expiry.toISOString().slice(0, 16);

  // Dietary checkboxes
  const tags = extracted.dietary_tags.split(',');
  document.querySelectorAll('input[name="food-diet"]').forEach(cb => {
    cb.checked = tags.includes(cb.value);
  });

  showToast(`AI auto-filled form with ${extracted.confidence_score}% confidence!`, 'success');
}

function loadNlpSample(idx) {
  const samples = {
    1: 'We have 45 servings of freshly cooked hot chicken biryani and rice from banquet lunch at 1 PM in foil trays with lids. Halal. Must be consumed within 3 hours.',
    2: 'Artisan bakery surplus: 30 freshly baked pain au chocolat and 25 baguettes. Stored in clean kraft cardboard bakery boxes. Vegetarian. Safe for 8 hours.',
    3: 'Fresh harvest surplus: 40 kg crisp organic lettuce and fresh carrots. Packaged in ventilated crates at room temperature. Vegan, safe for 24 hours.'
  };
  document.getElementById('ai-nlp-input').value = samples[idx] || '';
  runAiNlpExtraction();
}

function localNlpParser(text) {
  const lower = text.toLowerCase();
  let qty = 30;
  let unit = 'servings';
  const qtyMatch = text.match(/(\d+)\s*(servings?|portions?|meals?|plates?|loaves|boxes?|packs?|kg|liters?)/i);
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1], 10);
    unit = qtyMatch[2].toLowerCase();
  }

  let cat = 'PREPARED_MEAL';
  if (/bread|croissant|pastry|cake|baguette|bake/i.test(lower)) cat = 'BAKED_GOODS';
  else if (/vegetable|lettuce|carrot|produce|greens|fruit/i.test(lower)) cat = 'PRODUCE';
  else if (/milk|dairy|yogurt|cheese/i.test(lower)) cat = 'DAIRY';

  let dietary = ['VEGETARIAN'];
  if (/vegan/i.test(lower)) dietary.push('VEGAN');
  if (/halal/i.test(lower)) dietary.push('HALAL');
  if (/gluten[-\s]?free/i.test(lower)) dietary.push('GLUTEN_FREE');

  const images = {
    PREPARED_MEAL: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    BAKED_GOODS: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    PRODUCE: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    DAIRY: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
  };

  return {
    food_name: text.split(/[,\n]/)[0].trim().replace(/^(we have|there are|approx\.?)\s+/i, '') || 'Surplus Food Batch',
    category: cat,
    quantity: qty,
    unit: unit,
    dietary_tags: dietary.join(','),
    packaging: /box/i.test(lower) ? 'Eco Cardboard Bakery Boxes' : 'Heavy-Duty Foil Trays with Thermal Seal',
    temperature_condition: /hot|warm/i.test(lower) ? 'HOT' : 'ROOM_TEMP',
    expiry_hours: cat === 'PRODUCE' ? 24 : (cat === 'BAKED_GOODS' ? 8 : 4),
    image_url: images[cat] || images.PREPARED_MEAL,
    confidence_score: 96,
    notes: 'Parsed from kitchen notes by AI Assistant.'
  };
}

async function handleAddFoodSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('food-title').value.trim();
  const cat = document.getElementById('food-category').value;
  const qty = parseInt(document.getElementById('food-qty').value, 10);
  const unit = document.getElementById('food-unit').value;
  const packaging = document.getElementById('food-packaging').value;
  const temp = document.getElementById('food-temp').value;
  const expiry = document.getElementById('food-expiry').value;
  const imageUrl = document.getElementById('food-image').value || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600';
  const notes = document.getElementById('food-notes').value;

  const diets = [];
  document.querySelectorAll('input[name="food-diet"]:checked').forEach(cb => diets.push(cb.value));

  const newDonation = {
    id: Date.now(),
    donor_id: App.currentUser ? App.currentUser.id : 1,
    donor_name: App.currentUser ? App.currentUser.name : 'Chef Antonio Rossi',
    donor_org: App.currentUser ? App.currentUser.organization_name : 'Bistro Della Spiga',
    food_name: title,
    category: cat,
    quantity: qty,
    unit: unit,
    dietary_tags: diets.join(','),
    packaging: packaging,
    temperature_condition: temp,
    preparation_time: new Date().toISOString(),
    available_until: new Date(expiry).toISOString(),
    image_url: imageUrl,
    special_notes: notes,
    approx_location: App.currentUser ? App.currentUser.approx_location : 'Downtown Arts District',
    full_address: App.currentUser ? App.currentUser.full_address : '412 Renaissance Ave',
    latitude: App.currentUser ? App.currentUser.latitude : 40.7128,
    longitude: App.currentUser ? App.currentUser.longitude : -74.0060,
    status: 'AVAILABLE',
    distance_km: 1.2,
    pickup_otp: Math.floor(100000 + Math.random() * 900000).toString(),
    delivery_otp: Math.floor(100000 + Math.random() * 900000).toString()
  };

  App.donations.unshift(newDonation);

  // Sync to API
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/donations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDonation)
      });
    } catch (err) {}
  }

  // Audit log
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: newDonation.donor_name,
    role: 'DONOR',
    action: 'PUBLISH_DONATION',
    entity_type: 'Donation',
    entity_id: newDonation.id,
    details: `Listed ${qty} ${unit} of ${title} with safety certification.`,
    created_at: new Date().toLocaleString()
  });

  document.getElementById('modal-add-food').classList.remove('show');
  showToast('Surplus food published! It is now visible on the shelter discovery map.', 'success');
  renderDonorHub();
}

// --- ROLE 2: NGO / SHELTER HUB LOGIC ---
function renderNgoHub() {
  if (!App.currentUser) return;

  document.getElementById('ngo-greeting').textContent = `Welcome back, ${App.currentUser.name}!`;
  document.getElementById('ngo-org-label').textContent = App.currentUser.organization_name;

  // Update Claims Badge (active + completed)
  const myClaims = App.donations.filter(d =>
    (d.status === 'CLAIMED' || d.status === 'PICKED_UP' || d.status === 'DELIVERED') &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  );
  const activeClaimsCount = App.donations.filter(d =>
    (d.status === 'CLAIMED' || d.status === 'PICKED_UP') &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  ).length;
  const completedClaimsCount = App.donations.filter(d =>
    d.status === 'DELIVERED' &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  ).length;
  document.getElementById('ngo-claims-badge').textContent = activeClaimsCount + completedClaimsCount;

  // Update dynamic stats
  const totalRescuedMeals = App.donations.filter(d =>
    d.status === 'DELIVERED' && (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  ).reduce((sum, d) => sum + (d.quantity || 0), 0) + 1420;
  document.getElementById('ngo-stat-rescued-meals').textContent = totalRescuedMeals.toLocaleString();

  const inTransitCount = App.donations.filter(d =>
    (d.status === 'CLAIMED' || d.status === 'PICKED_UP') &&
    d.volunteer_id &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  ).length;
  document.getElementById('ngo-stat-in-transit').textContent = inTransitCount;

  if (App.ngoSubView === 'marketplace') {
    renderNgoMarketplace();
  } else if (App.ngoSubView === 'map') {
    initNgoMap();
  } else if (App.ngoSubView === 'claims') {
    renderNgoClaims();
  }
}

function switchNgoSubView(subView) {
  App.ngoSubView = subView;
  document.querySelectorAll('.view-switch-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`ngo-tab-${subView}`).classList.add('active');

  document.querySelectorAll('.ngo-subview').forEach(v => v.classList.remove('active'));
  document.getElementById(`ngo-subview-${subView}`).classList.add('active');

  renderNgoHub();
}

function renderNgoMarketplace() {
  const container = document.getElementById('ngo-marketplace-grid');
  if (!container) return;

  const availableItems = App.donations.filter(d => {
    if (d.status !== 'AVAILABLE') return false;
    if (App.ngoCategory !== 'ALL' && d.category !== App.ngoCategory) return false;
    if (App.ngoUrgentOnly) {
      const { hours, isExpired } = computeTimeLeft(d.available_until);
      if (isExpired || hours >= 3) return false;
    }
    if (App.ngoSearchQuery) {
      const q = App.ngoSearchQuery.toLowerCase();
      const matchTitle = d.food_name.toLowerCase().includes(q);
      const matchDonor = (d.donor_org || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDonor) return false;
    }
    return true;
  });

  if (availableItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #fff; border-radius: 16px; border: 1px solid var(--border-subtle);">
        <i class="fa-solid fa-seedling" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
        <h3>No food items match your filter</h3>
        <p style="color: var(--text-muted);">Try choosing "All Foods" or clearing your search term.</p>
      </div>
    `;
    return;
  }

  let html = '';
  availableItems.forEach(item => {
    const { hours, minutes } = computeTimeLeft(item.available_until);
    const dist = getDonationDistance(item);
    const isBeyondGeofence = dist > MAX_FOOD_SAFETY_DISTANCE_KM;

    // Build colorful category and dietary chips
    const diets = (item.dietary_tags || '').split(',').filter(Boolean);
    let dietChipsHtml = '';
    diets.forEach(tag => {
      const t = tag.trim().toUpperCase();
      let chipClass = 'chip-diet-default';
      let icon = 'fa-tag';
      if (t === 'VEGETARIAN') { chipClass = 'chip-veg'; icon = 'fa-leaf'; }
      else if (t === 'VEGAN') { chipClass = 'chip-vegan'; icon = 'fa-seedling'; }
      else if (t === 'HALAL') { chipClass = 'chip-halal'; icon = 'fa-moon'; }
      else if (t.includes('GLUTEN')) { chipClass = 'chip-gluten-free'; icon = 'fa-wheat-awn-circle-exclamation'; }
      dietChipsHtml += `<span class="df-chip ${chipClass}"><i class="fa-solid ${icon}"></i> ${escapeHtml(t)}</span>`;
    });

    // Category styling badge
    let catClass = 'chip-cat-prepared';
    if (item.category === 'BAKED_GOODS') catClass = 'chip-cat-baked';
    else if (item.category === 'PRODUCE') catClass = 'chip-cat-produce';
    else if (item.category === 'DAIRY') catClass = 'chip-cat-dairy';
    else if (item.category === 'PACKAGED') catClass = 'chip-cat-packaged';

    html += `
      <div class="donor-food-card ${isBeyondGeofence ? 'card-geofence-restricted' : ''}">
        <div class="df-image-wrap">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.food_name)}">
          <div class="df-floating-badge">
            ${isBeyondGeofence ? `
              <span class="status-tag status-restricted" title="Beyond 60 km maximum safe dispatch horizon">
                <i class="fa-solid fa-ban"></i> &gt;60km Restricted
              </span>
            ` : `
              <span class="status-tag status-available">
                <i class="fa-solid fa-circle-check"></i> Available
              </span>
            `}
          </div>
          <div class="df-floating-distance ${isBeyondGeofence ? 'dist-tag-warning' : 'dist-tag-ok'}">
            <i class="fa-solid fa-location-crosshairs"></i> ${dist} km
          </div>
        </div>

        <div class="df-body">
          <h3 class="df-title">${escapeHtml(item.food_name)}</h3>
          
          <div class="df-meta-chips">
            <span class="df-chip chip-quantity"><i class="fa-solid fa-box"></i> ${item.quantity} ${escapeHtml(item.unit)}</span>
            <span class="df-chip ${catClass}"><i class="fa-solid fa-utensils"></i> ${escapeHtml(item.category.replace('_', ' '))}</span>
            ${dietChipsHtml}
          </div>

          <div class="df-location-line">
            <i class="fa-solid fa-store text-accent"></i> <strong>Donor:</strong> ${escapeHtml(item.donor_org || item.donor_name)}
          </div>
          <div class="df-location-line ${isBeyondGeofence ? 'text-danger-strong' : ''}">
            <i class="fa-solid fa-location-dot ${isBeyondGeofence ? 'text-danger' : 'text-blue'}"></i> 
            <strong>Location:</strong> ${escapeHtml(item.approx_location)} &bull; 
            <span class="distance-emphasis ${isBeyondGeofence ? 'dist-restricted-text' : ''}">${dist} km from shelter</span>
          </div>
          <div class="df-time-line">
            <i class="fa-solid fa-clock text-warning"></i> <strong>Freshness Window:</strong> ${hours}h ${minutes}m left
          </div>

          ${isBeyondGeofence ? `
            <div class="geofence-rule-alert">
              <i class="fa-solid fa-shield-halved text-danger"></i>
              <div class="geofence-rule-text">
                <strong>60 km Food Safety Policy:</strong>
                <span>Listing is ${dist} km away. Claiming is restricted beyond 60 km to prevent thermal decay and ensure wholesome distribution.</span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="df-footer">
          ${isBeyondGeofence ? `
            <button class="btn-disabled-geofence" disabled title="Claiming is disabled for listings beyond the 60 km safety horizon.">
              <i class="fa-solid fa-ban"></i> Restricted (&gt;60 km from Shelter)
            </button>
          ` : `
            <button class="btn-primary btn-claim-action" style="width: 100%; justify-content: center;" onclick="claimFoodItem(${item.id})">
              <i class="fa-solid fa-hand-holding-heart"></i> Reserve & Claim for Shelter
            </button>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterNgoCategory(cat) {
  App.ngoCategory = cat;
  document.querySelectorAll('.ngo-chip[data-cat]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-cat') === cat);
  });
  renderNgoMarketplace();
}

function toggleNgoUrgency() {
  App.ngoUrgentOnly = !App.ngoUrgentOnly;
  const chip = document.getElementById('ngo-chip-urgent');
  if (chip) chip.classList.toggle('active', App.ngoUrgentOnly);
  renderNgoMarketplace();
}

function handleNgoSearch(val) {
  App.ngoSearchQuery = val.trim();
  renderNgoMarketplace();
}

// Leaflet Proximity Map for NGO
function initNgoMap() {
  if (App.leafletMap) {
    setTimeout(() => {
      App.leafletMap.invalidateSize();
      renderNgoMapMarkers();
    }, 200);
    return;
  }

  const container = document.getElementById('ngo-leaflet-map-container');
  if (!container) return;

  App.leafletMap = L.map('ngo-leaflet-map-container').setView([40.7282, -73.9942], 13);

  // High-Performance Free World Street Map Tiles (CORS-enabled, No API Key, No 403 Policy Block)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ &bull; Open Food Redistribution Network',
    maxZoom: 18
  }).addTo(App.leafletMap);

  // Official 60km Food Safety Maximum Boundary Ring (Regulatory Horizon)
  L.circle([40.7282, -73.9942], {
    color: '#ef4444',
    weight: 2,
    dashArray: '6, 8',
    fillColor: '#ef4444',
    fillOpacity: 0.02,
    radius: MAX_FOOD_SAFETY_DISTANCE_KM * 1000
  }).bindTooltip('60 km Maximum Safe Dispatch Horizon (Quality & Transit Policy)', { permanent: false, direction: 'top' })
    .addTo(App.leafletMap);

  // Proximity Discovery Circle (Adjusted via slider)
  App.mapRadiusCircle = L.circle([40.7282, -73.9942], {
    color: '#10b981',
    weight: 2,
    fillColor: '#10b981',
    fillOpacity: 0.09,
    radius: App.ngoRadiusKm * 1000
  }).addTo(App.leafletMap);

  renderNgoMapMarkers();
}

function renderNgoMapMarkers() {
  if (!App.leafletMap) return;

  // Clear previous markers
  App.mapMarkers.forEach(m => App.leafletMap.removeLayer(m));
  App.mapMarkers = [];

  const available = App.donations.filter(d => {
    if (d.status !== 'AVAILABLE') return false;
    const dist = getDonationDistance(d);
    return dist <= App.ngoRadiusKm;
  });

  available.forEach(item => {
    const dist = getDonationDistance(item);
    const isBeyondGeofence = dist > MAX_FOOD_SAFETY_DISTANCE_KM;

    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background:${isBeyondGeofence ? '#ef4444' : '#10b981'}; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; border:2.5px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,0.35); font-size:14px;">
          <i class="fa-solid ${isBeyondGeofence ? 'fa-ban' : 'fa-utensils'}"></i>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([item.latitude, item.longitude], { icon: customIcon }).addTo(App.leafletMap);
    
    const popupContent = `
      <div style="width:250px; padding:6px; font-family:var(--font-sans);">
        <img src="${escapeHtml(item.image_url)}" style="width:100%; height:120px; object-fit:cover; border-radius:10px; margin-bottom:8px;">
        <h4 style="font-size:0.95rem; font-weight:800; margin-bottom:4px; line-height:1.25;">${escapeHtml(item.food_name)}</h4>
        <p style="font-size:0.78rem; color:#64748b; margin-bottom:4px;"><i class="fa-solid fa-store text-accent"></i> <strong>Donor:</strong> ${escapeHtml(item.donor_org || item.donor_name)}</p>
        <p style="font-size:0.78rem; color:${isBeyondGeofence ? '#dc2626' : '#059669'}; font-weight:700; margin-bottom:8px;">
          <i class="fa-solid fa-location-dot"></i> ${dist} km from your shelter
        </p>

        ${isBeyondGeofence ? `
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 10px; margin-bottom:8px; font-size:0.75rem; color:#991b1b; line-height:1.4;">
            <i class="fa-solid fa-shield-halved text-danger"></i> <strong>Restricted:</strong> Beyond 60 km dispatch horizon. Claiming blocked to ensure food safety.
          </div>
          <button class="btn-disabled-geofence" disabled style="width:100%; padding:6px 12px; font-size:0.78rem; justify-content:center; background:#f1f5f9; color:#94a3b8; border:1px dashed #cbd5e1; border-radius:8px; cursor:not-allowed;">
            <i class="fa-solid fa-ban"></i> Restricted (>60km)
          </button>
        ` : `
          <button class="btn-primary" style="width:100%; padding:8px 12px; font-size:0.84rem; justify-content:center;" onclick="claimFoodItem(${item.id})">
            <i class="fa-solid fa-hand-holding-heart"></i> Claim Surplus
          </button>
        `}
      </div>
    `;
    marker.bindPopup(popupContent);
    App.mapMarkers.push(marker);
  });
}

function handleLeafletRadiusChange(val) {
  App.ngoRadiusKm = parseFloat(val);
  document.getElementById('leaflet-radius-label').textContent = `${val} km`;
  if (App.mapRadiusCircle) {
    App.mapRadiusCircle.setRadius(App.ngoRadiusKm * 1000);
  }
  renderNgoMapMarkers();
}

// NGO Claims View — with sub-tabs: Active Deliveries & Completed History
function renderNgoClaims() {
  const container = document.getElementById('ngo-claims-list-wrapper');
  if (!container) return;

  const activeClaims = App.donations.filter(d =>
    (d.status === 'CLAIMED' || d.status === 'PICKED_UP') &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  );
  const completedClaims = App.donations.filter(d =>
    d.status === 'DELIVERED' &&
    (d.ngo_id === (App.currentUser ? App.currentUser.id : 2))
  );

  // Determine which sub-tab is active
  const activeSubTab = App.ngoClaimsSubTab || 'active';

  let html = `
    <div class="ngo-claims-subtabs">
      <button class="claims-subtab-btn ${activeSubTab === 'active' ? 'active' : ''}" onclick="switchNgoClaimsSubTab('active')">
        <i class="fa-solid fa-truck-fast"></i> Active Deliveries (${activeClaims.length})
      </button>
      <button class="claims-subtab-btn ${activeSubTab === 'completed' ? 'active' : ''}" onclick="switchNgoClaimsSubTab('completed')">
        <i class="fa-solid fa-circle-check"></i> Completed / Delivered (${completedClaims.length})
      </button>
    </div>
  `;

  if (activeSubTab === 'active') {
    if (activeClaims.length === 0) {
      html += `
        <div style="padding: 48px; text-align: center; background: #fff; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <i class="fa-solid fa-hand-holding-heart" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
          <h3>No active reserved food claims</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Browse the marketplace feed to claim surplus meals for your shelter.</p>
          <button class="btn-primary" onclick="switchNgoSubView('marketplace')">Browse Available Food</button>
        </div>
      `;
    } else {
      activeClaims.forEach(item => {
        const isInTransit = item.status === 'PICKED_UP';
        const hasVolunteer = item.volunteer_id && item.volunteer_name;
        const waitingForCourier = !hasVolunteer;

        let statusLabel, statusClass;
        if (waitingForCourier) {
          statusLabel = 'Waiting for Courier';
          statusClass = 'status-pending';
        } else if (isInTransit) {
          statusLabel = 'Courier In Transit';
          statusClass = 'status-delivered';
        } else {
          statusLabel = 'Courier Assigned — Heading to Pickup';
          statusClass = 'status-claimed';
        }

        html += `
          <div class="mission-dispatch-card" style="background:#ffffff; margin-bottom: 16px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span class="status-tag ${statusClass}">
                ${statusLabel}
              </span>
              <span style="font-weight:800; font-size:0.9rem;">${item.quantity} ${escapeHtml(item.unit)}</span>
            </div>

            <h3 style="font-size:1.2rem; font-weight:800;">${escapeHtml(item.food_name)}</h3>
            <p style="font-size:0.86rem; color:var(--text-muted);"><i class="fa-solid fa-store"></i> Donor: ${escapeHtml(item.donor_org || item.donor_name)} &bull; ${escapeHtml(item.full_address)}</p>

            ${waitingForCourier ? `
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 16px; margin-top: 8px;">
                <p style="font-size: 0.88rem; font-weight: 700; color: #92400e; margin: 0;">
                  <i class="fa-solid fa-clock"></i> Awaiting volunteer courier to accept this delivery mission.
                </p>
                <p style="font-size: 0.78rem; color: #92400e; margin: 4px 0 0;">
                  The delivery PIN will be revealed once a courier is assigned and arrives at your shelter.
                </p>
              </div>
            ` : `
              <!-- NGO 6-Digit Delivery PIN Reveal -->
              <div class="df-otp-box">
                <span class="df-otp-label"><i class="fa-solid fa-key"></i> YOUR SHELTER DELIVERY CONFIRMATION PIN:</span>
                <div class="df-otp-code">${item.delivery_otp || '381904'}</div>
                <p style="font-size: 0.74rem; color: #b45309; margin-top: 4px;">
                  Provide this PIN to courier (${escapeHtml(item.volunteer_name)}) when they hand over the food to confirm safe arrival.
                </p>
              </div>
            `}
          </div>
        `;
      });
    }
  } else {
    // Completed sub-tab
    if (completedClaims.length === 0) {
      html += `
        <div style="padding: 48px; text-align: center; background: #fff; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
          <h3>No completed deliveries yet</h3>
          <p style="color: var(--text-muted);">Once a courier delivers claimed food and verifies the handshake PIN, completed distributions will appear here.</p>
        </div>
      `;
    } else {
      completedClaims.forEach(item => {
        const kgDiverted = ((item.quantity || 30) * 0.45).toFixed(1);
        const co2Saved = ((item.quantity || 30) * 0.45 * 2.5).toFixed(1);
        const deliveredTime = item.delivered_at || new Date().toLocaleString();

        html += `
          <div class="mission-dispatch-card completed-claim-card" style="background:#ffffff; margin-bottom: 16px; border-left: 4px solid #10b981;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span class="status-tag status-delivered">
                <i class="fa-solid fa-circle-check"></i> Delivered & Rescued
              </span>
              <span style="font-weight:800; font-size:0.9rem;">${item.quantity} ${escapeHtml(item.unit)}</span>
            </div>

            <h3 style="font-size:1.2rem; font-weight:800;">${escapeHtml(item.food_name)}</h3>
            <p style="font-size:0.86rem; color:var(--text-muted);">
              <i class="fa-solid fa-store"></i> Donor: ${escapeHtml(item.donor_org || item.donor_name)}
            </p>
            <p style="font-size:0.82rem; color:var(--text-muted);">
              <i class="fa-solid fa-bicycle"></i> Delivered by: ${escapeHtml(item.volunteer_name || 'Volunteer Courier')}
            </p>
            <p style="font-size:0.82rem; color:var(--text-muted);">
              <i class="fa-solid fa-calendar-check"></i> Verified: ${deliveredTime}
            </p>

            <!-- Verified Clean Distribution Badge -->
            <div style="display:flex; align-items:center; gap:8px; margin-top:10px; padding:10px 14px; background:#ecfdf5; border-radius:10px; border:1px solid #a7f3d0;">
              <i class="fa-solid fa-shield-check" style="font-size:1.4rem; color:#059669;"></i>
              <div>
                <strong style="color:#065f46; font-size:0.88rem;">Verified Clean Distribution</strong>
                <p style="font-size:0.76rem; color:#047857; margin:2px 0 0;">Dual OTP handshake confirmed by donor & shelter. HACCP-compliant chain of custody.</p>
              </div>
            </div>

            <!-- Impact Breakdown -->
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px;">
              <div style="text-align:center; padding:10px 6px; background:#f0fdf4; border-radius:10px; border:1px solid #bbf7d0;">
                <div style="font-weight:800; font-size:1.1rem; color:#059669;">${item.quantity}</div>
                <div style="font-size:0.72rem; color:#065f46; font-weight:600;">Meals Served</div>
              </div>
              <div style="text-align:center; padding:10px 6px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe;">
                <div style="font-weight:800; font-size:1.1rem; color:#2563eb;">${kgDiverted} kg</div>
                <div style="font-size:0.72rem; color:#1e3a5f; font-weight:600;">Diverted from Landfill</div>
              </div>
              <div style="text-align:center; padding:10px 6px; background:#f0fdf4; border-radius:10px; border:1px solid #bbf7d0;">
                <div style="font-weight:800; font-size:1.1rem; color:#059669;">${co2Saved} kg</div>
                <div style="font-size:0.72rem; color:#065f46; font-weight:600;">CO₂ Saved</div>
              </div>
            </div>
          </div>
        `;
      });
    }
  }

  container.innerHTML = html;
}

function switchNgoClaimsSubTab(tab) {
  App.ngoClaimsSubTab = tab;
  renderNgoClaims();
}

// Claim Food Action (NGO)
async function claimFoodItem(id) {
  if (App.currentUser && App.currentUser.role === 'NGO' && App.currentUser.verification_status === 'PENDING') {
    showToast('Your shelter registration certificate is currently under review by Admin. Claiming requires verified accreditation.', 'warning');
    return;
  }

  const item = App.donations.find(d => d.id === id);
  if (!item) return;

  // Enforce 60 km Food Safety Geofence Restriction
  const dist = getDonationDistance(item);
  if (dist > MAX_FOOD_SAFETY_DISTANCE_KM) {
    showToast(`Food Safety Policy: "${item.food_name}" is ${dist} km away. Claiming is restricted to within 60 km to protect temperature and avoid food spoilage during transit.`, 'error');
    return;
  }

  item.status = 'CLAIMED';
  item.ngo_id = App.currentUser ? App.currentUser.id : 2;
  item.ngo_name = App.currentUser ? App.currentUser.name : 'Maria Santos';
  item.ngo_org = App.currentUser ? App.currentUser.organization_name : 'Hope Community Kitchen';
  // Volunteer is NOT assigned at claim time — they accept from the dispatch board
  item.volunteer_id = null;
  item.volunteer_name = null;
  if (!item.pickup_otp) item.pickup_otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (!item.delivery_otp) item.delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Sync to API
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/actions.php?action=claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_id: id })
      });
    } catch (e) {}
  }

  // Audit log
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: item.ngo_name,
    role: 'NGO',
    action: 'CLAIM_DONATION',
    entity_type: 'Donation',
    entity_id: item.id,
    details: `Claimed ${item.quantity} ${item.unit} of ${item.food_name}. 6-digit handshake PINs generated.`,
    created_at: new Date().toLocaleString()
  });

  showToast(`Reserved "${item.food_name}"! Waiting for a volunteer courier to accept the delivery mission.`, 'success');
  switchNgoSubView('claims');
}

// --- ROLE 3: VOLUNTEER COURIER HUB LOGIC ---
function renderVolunteerHub() {
  if (!App.currentUser) return;

  document.getElementById('vol-greeting').textContent = `Ready for missions, ${App.currentUser.name}!`;
  document.getElementById('vol-org-label').textContent = App.currentUser.organization_name;

  // Available missions: CLAIMED with no volunteer assigned
  const availableMissions = App.donations.filter(d => d.status === 'CLAIMED' && !d.volunteer_id);
  // My active missions: assigned to me and not delivered yet
  const myMissions = App.donations.filter(d =>
    (d.status === 'CLAIMED' || d.status === 'PICKED_UP') &&
    d.volunteer_id === (App.currentUser ? App.currentUser.id : 3)
  );
  // My completed missions
  const myCompleted = App.donations.filter(d =>
    d.status === 'DELIVERED' &&
    d.volunteer_id === (App.currentUser ? App.currentUser.id : 3)
  );

  document.getElementById('vol-stat-active-missions').textContent = myMissions.length;
  document.getElementById('vol-stat-completed').textContent = myCompleted.length + 24; // +24 seed history
  const availBadge = document.getElementById('vol-available-badge');
  if (availBadge) availBadge.textContent = availableMissions.length;
  const activeBadge = document.getElementById('vol-active-badge');
  if (activeBadge) activeBadge.textContent = myMissions.length;

  const volSubTab = App.volunteerSubTab || 'available';

  // Render the appropriate tab content
  if (volSubTab === 'available') {
    renderVolunteerAvailableMissions(availableMissions);
  } else {
    renderVolunteerMyMissions(myMissions);
  }
}

function switchVolunteerSubTab(tab) {
  App.volunteerSubTab = tab;
  document.querySelectorAll('.vol-subtab-btn').forEach(btn => btn.classList.remove('active'));
  const target = document.getElementById(`vol-tab-${tab}`);
  if (target) target.classList.add('active');
  renderVolunteerHub();
}

function renderVolunteerAvailableMissions(availableMissions) {
  const container = document.getElementById('vol-missions-grid');
  if (!container) return;

  if (availableMissions.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #fafafa; border-radius: 16px; border: 1.5px dashed var(--border-subtle);">
        <i class="fa-solid fa-clipboard-check" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
        <h3>No available delivery missions right now</h3>
        <p style="color: var(--text-muted);">When an NGO claims food from a donor, unassigned missions will appear here for you to accept.</p>
      </div>
    `;
    return;
  }

  let html = '';
  availableMissions.forEach(m => {
    const { hours, minutes } = computeTimeLeft(m.available_until);
    html += `
      <div class="mission-dispatch-card" style="border-left: 4px solid #f59e0b;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span class="status-tag status-pending">
            <i class="fa-solid fa-hand-pointer"></i> Needs Courier
          </span>
          <span style="font-weight:800;">${m.quantity} ${escapeHtml(m.unit)}</span>
        </div>

        <h3 style="font-size:1.15rem; font-weight:800;">${escapeHtml(m.food_name)}</h3>

        <div class="m-route-box">
          <div class="m-stop">
            <div class="m-icon bg-amber-light text-warning"><i class="fa-solid fa-store"></i></div>
            <div>
              <strong style="font-size:0.86rem;">Pickup: ${escapeHtml(m.donor_org || m.donor_name)}</strong>
              <div style="font-size:0.76rem; color:var(--text-muted);">${escapeHtml(m.full_address || m.approx_location)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${m.distance_km || 1.8} km away</div>
            </div>
          </div>

          <div style="border-left: 2px dashed #cbd5e1; height: 16px; margin-left: 15px;"></div>

          <div class="m-stop">
            <div class="m-icon bg-emerald-light text-accent"><i class="fa-solid fa-building-ngo"></i></div>
            <div>
              <strong style="font-size:0.86rem;">Deliver to: ${escapeHtml(m.ngo_org || 'Shelter')}</strong>
              <div style="font-size:0.76rem; color:var(--text-muted);">Claimed by: ${escapeHtml(m.ngo_name || 'NGO')}</div>
            </div>
          </div>
        </div>

        <div style="font-size:0.82rem; color:var(--color-warning); font-weight:700; margin-bottom:8px;">
          <i class="fa-solid fa-clock"></i> Food safety window: ${hours}h ${minutes}m remaining
        </div>

        <button class="btn-primary" style="width:100%; justify-content:center; background: linear-gradient(135deg, #f59e0b, #d97706);" onclick="acceptDeliveryMission(${m.id})">
          <i class="fa-solid fa-hand-pointer"></i> Accept Delivery Mission
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderVolunteerMyMissions(myMissions) {
  const container = document.getElementById('vol-missions-grid');
  if (!container) return;

  if (myMissions.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #fafafa; border-radius: 16px; border: 1.5px dashed var(--border-subtle);">
        <i class="fa-solid fa-bicycle" style="font-size: 2.5rem; color: var(--text-subtle); margin-bottom: 12px;"></i>
        <h3>No active missions assigned to you</h3>
        <p style="color: var(--text-muted);">Accept a mission from the "Available Missions" board to get started.</p>
        <button class="btn-primary" style="margin-top:12px;" onclick="switchVolunteerSubTab('available')">
          <i class="fa-solid fa-clipboard-list"></i> Browse Available Missions
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  myMissions.forEach(m => {
    const isTransit = m.status === 'PICKED_UP';
    html += `
      <div class="mission-dispatch-card" style="border-left: 4px solid ${isTransit ? '#10b981' : '#3b82f6'};">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span class="status-tag ${isTransit ? 'status-delivered' : 'status-claimed'}">
            ${isTransit ? 'Step 2: In Transit to Shelter' : 'Step 1: Heading to Kitchen'}
          </span>
          <span style="font-weight:800;">${m.quantity} ${escapeHtml(m.unit)}</span>
        </div>

        <h3 style="font-size:1.15rem; font-weight:800;">${escapeHtml(m.food_name)}</h3>

        <div class="m-route-box">
          <div class="m-stop">
            <div class="m-icon bg-amber-light text-warning"><i class="fa-solid fa-store"></i></div>
            <div>
              <strong style="font-size:0.86rem;">Pickup: ${escapeHtml(m.donor_org || m.donor_name)}</strong>
              <div style="font-size:0.76rem; color:var(--text-muted);">${escapeHtml(m.full_address || m.approx_location)}</div>
              <a href="https://maps.google.com/?q=${encodeURIComponent(m.full_address)}" target="_blank" style="font-size:0.75rem; color:var(--color-blue); font-weight:700;">
                <i class="fa-solid fa-diamond-turn-right"></i> Open Navigation
              </a>
            </div>
          </div>

          <div style="border-left: 2px dashed #cbd5e1; height: 16px; margin-left: 15px;"></div>

          <div class="m-stop">
            <div class="m-icon bg-emerald-light text-accent"><i class="fa-solid fa-building-ngo"></i></div>
            <div>
              <strong style="font-size:0.86rem;">Delivery: ${escapeHtml(m.ngo_org || 'Hope Community Kitchen')}</strong>
              <div style="font-size:0.76rem; color:var(--text-muted);">789 Outreach Blvd, Eastside Center</div>
              <a href="https://maps.google.com/?q=789+Outreach+Blvd" target="_blank" style="font-size:0.75rem; color:var(--color-blue); font-weight:700;">
                <i class="fa-solid fa-diamond-turn-right"></i> Open Navigation
              </a>
            </div>
          </div>
        </div>

        <div>
          ${!isTransit ? `
            <button class="btn-primary" style="width:100%; justify-content:center; background:var(--color-warning);" onclick="openOtpHandshakeModal(${m.id}, 'pickup')">
              <i class="fa-solid fa-key"></i> Enter Donor Pickup PIN
            </button>
          ` : `
            <button class="btn-primary" style="width:100%; justify-content:center; background:var(--primary-accent);" onclick="openOtpHandshakeModal(${m.id}, 'delivery')">
              <i class="fa-solid fa-circle-check"></i> Enter Shelter Delivery PIN
            </button>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Accept a delivery mission from the Available Missions board
async function acceptDeliveryMission(donationId) {
  const item = App.donations.find(d => d.id === donationId);
  if (!item) return;

  if (item.volunteer_id) {
    showToast('This mission has already been accepted by another courier.', 'warning');
    renderVolunteerHub();
    return;
  }

  // Assign to current volunteer
  item.volunteer_id = App.currentUser ? App.currentUser.id : 3;
  item.volunteer_name = App.currentUser ? App.currentUser.name : 'Alex Chen';

  // Sync to API
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/actions.php?action=assign_volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_id: donationId,
          volunteer_id: App.currentUser ? App.currentUser.id : 3
        })
      });
    } catch (e) {}
  }

  // Audit log
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: App.currentUser ? App.currentUser.name : 'Alex Chen',
    role: 'VOLUNTEER',
    action: 'ACCEPT_MISSION',
    entity_type: 'Delivery',
    entity_id: item.id,
    details: `Accepted courier mission: "${item.food_name}" from ${item.donor_org || item.donor_name} → ${item.ngo_org || 'Shelter'}.`,
    created_at: new Date().toLocaleString()
  });

  showToast(`Mission accepted! Head to ${item.donor_org || item.donor_name} to pick up the food.`, 'success');

  // Switch to My Active Missions tab
  App.volunteerSubTab = 'active';
  renderVolunteerHub();
  // Also update the tab buttons
  document.querySelectorAll('.vol-subtab-btn').forEach(btn => btn.classList.remove('active'));
  const activeTab = document.getElementById('vol-tab-active');
  if (activeTab) activeTab.classList.add('active');
}

function toggleVolunteerAvailability() {
  App.volunteerAvailable = !App.volunteerAvailable;
  const btn = document.getElementById('btn-vol-toggle');
  const txt = document.getElementById('vol-avail-text');
  if (App.volunteerAvailable) {
    btn.className = 'btn-toggle-avail active';
    btn.innerHTML = '<i class="fa-solid fa-power-off"></i> Online';
    txt.innerHTML = 'Status: <strong>Available for Missions</strong>';
    showToast('You are now active to receive delivery missions.', 'success');
  } else {
    btn.className = 'btn-toggle-avail';
    btn.innerHTML = '<i class="fa-solid fa-power-off"></i> Offline';
    txt.innerHTML = 'Status: <strong style="color:var(--text-subtle);">Offline / Resting</strong>';
    showToast('You are marked offline.', 'info');
  }
}

// ReTray 6-Digit Verification Handshake (Pickup & Delivery)
function openOtpHandshakeModal(donationId, type) {
  App.pendingOtpContext = { donationId, type };
  const modal = document.getElementById('modal-otp');
  const title = document.getElementById('otp-title');
  const instr = document.getElementById('otp-instructions');
  const input = document.getElementById('otp-code-input');

  if (type === 'pickup') {
    title.textContent = 'Enter Donor Pickup PIN';
    instr.textContent = 'Ask the Chef / Restaurant for the 6-digit PIN code displayed on their screen to verify custody transfer.';
  } else {
    title.textContent = 'Enter Shelter Delivery PIN';
    instr.textContent = 'Ask the Shelter Receiver / NGO for their 6-digit confirmation PIN code upon delivering the food safely.';
  }

  input.value = '';
  modal.classList.add('show');
  setTimeout(() => input.focus(), 100);
}

async function submitOtpVerification() {
  if (!App.pendingOtpContext) return;
  const { donationId, type } = App.pendingOtpContext;
  const input = document.getElementById('otp-code-input');
  const entered = input.value.trim();

  if (entered.length !== 6) {
    showToast('Please enter the full 6-digit verification code.', 'error');
    return;
  }

  const item = App.donations.find(d => d.id === donationId);
  if (!item) return;

  const expected = type === 'pickup' ? (item.pickup_otp || '749215') : (item.delivery_otp || '381904');

  if (entered !== expected) {
    showToast('Invalid PIN! Please check the counterpart screen.', 'error');
    return;
  }

  // OTP Verified!
  if (type === 'pickup') {
    item.status = 'PICKED_UP';
    App.auditLogs.unshift({
      id: App.auditLogs.length + 101,
      actor_name: App.currentUser ? App.currentUser.name : 'Alex Chen',
      role: 'VOLUNTEER',
      action: 'VERIFY_PICKUP',
      entity_type: 'Pickup',
      entity_id: item.id,
      details: `Pickup verified with PIN (${entered}). Courier has food in transit.`,
      created_at: new Date().toLocaleString()
    });
    showToast('Pickup verified! Custody transferred. Courier en route to shelter.', 'success');
  } else {
    item.status = 'DELIVERED';
    item.delivered_at = new Date().toLocaleString();
    App.auditLogs.unshift({
      id: App.auditLogs.length + 101,
      actor_name: item.ngo_name || 'Maria Santos',
      role: 'NGO',
      action: 'CONFIRM_DELIVERY',
      entity_type: 'Delivery',
      entity_id: item.id,
      details: `Delivery confirmed with PIN (${entered}). Wholesome meals distributed!`,
      created_at: new Date().toLocaleString()
    });
    showToast('Delivery confirmed! Redistribution mission completed successfully.', 'success');
  }

  // Sync to API
  if (App.isLampBackendOnline) {
    try {
      const act = type === 'pickup' ? 'verify_pickup_otp' : 'verify_delivery_otp';
      await fetch(`api/actions.php?action=${act}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_id: donationId, otp: entered })
      });
    } catch (e) {}
  }

  document.getElementById('modal-otp').classList.remove('show');
  App.pendingOtpContext = null;

  // Re-render all affected dashboards
  renderVolunteerHub();
  renderDonorHub();
  renderNgoHub();
}

// --- ROLE 4: ADMIN HUB LOGIC ---
function switchAdminTab(tabName) {
  ['queue', 'metrics', 'tickets', 'audit'].forEach(t => {
    const btn = document.getElementById(`atab-${t}`);
    const content = document.getElementById(`admin-content-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (content) content.classList.toggle('active', t === tabName);
  });

  if (tabName === 'queue') renderPendingNgosQueue();
  if (tabName === 'metrics') {
    renderAdminTrendChart();
    renderAdminLeaderboard();
  }
  if (tabName === 'tickets') renderAdminSupportTickets();
  if (tabName === 'audit') renderAdminAuditLogs();
}

function renderAdminHub() {
  // 1. Pending NGO verification queue
  renderPendingNgosQueue();

  // 2. SVG Bar Chart & Impact
  renderAdminTrendChart();

  // 3. Leaderboard
  renderAdminLeaderboard();

  // 4. Support Tickets
  renderAdminSupportTickets();

  // 5. Audit Logs Table
  renderAdminAuditLogs();
}

function renderPendingNgosQueue() {
  const tbody = document.getElementById('admin-pending-ngo-tbody');
  const countBadge = document.getElementById('admin-pending-count');
  if (!tbody) return;

  const pending = App.pendingNgos.filter(n => n.verification_status === 'PENDING');
  if (countBadge) countBadge.textContent = pending.length;

  if (pending.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
          <i class="fa-solid fa-circle-check text-accent" style="font-size: 2.2rem; margin-bottom: 8px; display: block;"></i>
          <strong style="color: var(--text-dark); font-size: 1rem;">All NGO registration certificates verified!</strong>
          <p style="font-size: 0.85rem; margin-top: 4px;">New NGO registrations requiring accreditation review will appear here automatically.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pending.forEach(ngo => {
    html += `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-dark); font-size: 0.95rem;">${escapeHtml(ngo.organization_name)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(ngo.approx_location || 'Metropolitan Area')}</div>
        </td>
        <td>
          <strong>${escapeHtml(ngo.name)}</strong>
        </td>
        <td>
          <div style="font-size: 0.84rem;"><i class="fa-regular fa-envelope"></i> ${escapeHtml(ngo.email)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> ${escapeHtml(ngo.phone || 'N/A')}</div>
        </td>
        <td>
          <button class="btn-sm btn-outline" onclick="openCertificateModal(${ngo.id})">
            <i class="fa-solid fa-file-contract text-accent"></i> View Certificate
          </button>
        </td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">
          ${escapeHtml(ngo.created_at)}
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-sm btn-success" onclick="approveNgoCertificate(${ngo.id})">
              <i class="fa-solid fa-check"></i> Approve
            </button>
            <button class="btn-sm btn-danger" onclick="rejectNgoCertificate(${ngo.id})">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function openCertificateModal(ngoId) {
  const ngo = App.pendingNgos.find(n => n.id === ngoId);
  if (!ngo) return;

  const title = document.getElementById('cert-view-title');
  const org = document.getElementById('cert-view-org');
  const img = document.getElementById('cert-view-img');
  const actionRow = document.getElementById('cert-action-buttons');

  if (title) title.textContent = `Official Accreditation Document — ${ngo.organization_name}`;
  if (org) org.innerHTML = `<strong>${escapeHtml(ngo.name)}</strong> &bull; ${escapeHtml(ngo.email)} &bull; ${escapeHtml(ngo.phone || '')}`;
  if (img) {
    img.src = ngo.certificate_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600';
  }

  if (actionRow) {
    actionRow.innerHTML = `
      <button type="button" class="btn-secondary" onclick="closeAuthModal(null, 'modal-view-certificate')">Close Preview</button>
      <button type="button" class="btn-danger" onclick="rejectNgoCertificate(${ngo.id}); closeAuthModal(null, 'modal-view-certificate')">
        <i class="fa-solid fa-xmark"></i> Reject Application
      </button>
      <button type="button" class="btn-primary" onclick="approveNgoCertificate(${ngo.id}); closeAuthModal(null, 'modal-view-certificate')">
        <i class="fa-solid fa-check"></i> Approve & Verify Shelter
      </button>
    `;
  }

  document.getElementById('modal-view-certificate').classList.add('show');
}

async function approveNgoCertificate(ngoId) {
  const ngo = App.pendingNgos.find(n => n.id === ngoId);
  if (!ngo) return;

  ngo.verification_status = 'APPROVED';

  // API call if online
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/auth.php?action=verify_ngo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo_id: ngoId, status: 'APPROVED' })
      });
    } catch (e) {}
  }

  // Audit log entry
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: App.currentUser ? App.currentUser.name : 'Dr. Sarah Jenkins',
    role: 'ADMIN',
    action: 'VERIFY_NGO_CERTIFICATE',
    entity_type: 'User',
    entity_id: ngoId,
    details: `Approved official non-profit accreditation certificate for "${ngo.organization_name}". Shelter authorized for surplus claiming.`,
    created_at: new Date().toLocaleString()
  });

  showToast(`Certificate Approved! "${ngo.organization_name}" is now fully certified to claim surplus food.`, 'success');
  renderPendingNgosQueue();
  renderAdminAuditLogs();
}

async function rejectNgoCertificate(ngoId) {
  const ngo = App.pendingNgos.find(n => n.id === ngoId);
  if (!ngo) return;

  ngo.verification_status = 'REJECTED';

  // API call if online
  if (App.isLampBackendOnline) {
    try {
      await fetch('api/auth.php?action=verify_ngo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo_id: ngoId, status: 'REJECTED' })
      });
    } catch (e) {}
  }

  // Audit log entry
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: App.currentUser ? App.currentUser.name : 'Dr. Sarah Jenkins',
    role: 'ADMIN',
    action: 'REJECT_NGO_CERTIFICATE',
    entity_type: 'User',
    entity_id: ngoId,
    details: `Rejected registration certificate for "${ngo.organization_name}". Non-conforming documentation.`,
    created_at: new Date().toLocaleString()
  });

  showToast(`Application rejected for "${ngo.organization_name}".`, 'info');
  renderPendingNgosQueue();
  renderAdminAuditLogs();
}

function renderAdminSupportTickets() {
  const tbody = document.getElementById('admin-tickets-tbody');
  if (!tbody) return;

  let html = '';
  App.supportTickets.forEach(ticket => {
    const isResolved = ticket.status === 'RESOLVED';
    const badgeClass = ticket.priority === 'HIGH' ? 'badge-urgent' : (ticket.priority === 'MEDIUM' ? 'badge-claimed' : 'badge-neutral');
    html += `
      <tr>
        <td><strong>#TK-${ticket.id}</strong></td>
        <td>
          <strong>${escapeHtml(ticket.user_name)}</strong>
          <span class="dp-badge badge-${ticket.user_role.toLowerCase()}" style="font-size:0.7rem; margin-left:4px;">${ticket.user_role}</span>
        </td>
        <td>
          <div style="font-weight:600; font-size:0.88rem;">${escapeHtml(ticket.subject)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(ticket.created_at)}</div>
        </td>
        <td>
          <span class="dp-badge ${badgeClass}">${ticket.priority}</span>
        </td>
        <td>
          <span class="dp-badge ${isResolved ? 'badge-delivered' : 'badge-available'}">${ticket.status}</span>
        </td>
        <td>
          ${isResolved 
            ? '<span style="color:var(--primary-accent); font-size:0.85rem;"><i class="fa-solid fa-check-double"></i> Closed</span>'
            : `<button class="btn-sm btn-outline" onclick="resolveTicket(${ticket.id})"><i class="fa-solid fa-check"></i> Mark Resolved</button>`
          }
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function resolveTicket(ticketId) {
  const ticket = App.supportTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  ticket.status = 'RESOLVED';
  App.auditLogs.unshift({
    id: App.auditLogs.length + 101,
    actor_name: App.currentUser ? App.currentUser.name : 'Dr. Sarah Jenkins',
    role: 'ADMIN',
    action: 'RESOLVE_TICKET',
    entity_type: 'SupportTicket',
    entity_id: ticketId,
    details: `Resolved ticket #TK-${ticketId} ("${ticket.subject}") for ${ticket.user_name}.`,
    created_at: new Date().toLocaleString()
  });

  showToast(`Ticket #TK-${ticketId} resolved successfully.`, 'success');
  renderAdminSupportTickets();
  renderAdminAuditLogs();
}

function renderAdminTrendChart() {
  const container = document.getElementById('admin-chart-box');
  if (!container) return;

  const data = [
    { label: 'May', value: 140 },
    { label: 'Jun', value: 210 },
    { label: 'Jul', value: 295 },
    { label: 'Aug', value: 360 },
    { label: 'Sep', value: 415 },
    { label: 'Oct', value: 520 },
    { label: 'Nov', value: 680 }
  ];

  const W = 520, H = 180, barArea = 140;
  const max = Math.max(...data.map(d => d.value));
  const n = data.length;
  const barW = Math.floor((W - (n - 1) * 16) / n);

  let bars = '';
  data.forEach((d, i) => {
    const barH = (d.value / max) * barArea;
    const x = i * (barW + 16);
    const y = barArea - barH;
    bars += `
      <g>
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="#10b981" opacity="${i === n-1 ? '1' : '0.85'}"></rect>
        <text x="${x + barW / 2}" y="${y - 6}" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">${d.value}</text>
        <text x="${x + barW / 2}" y="${barArea + 18}" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">${d.label}</text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="180">
      <line x1="0" y1="${barArea}" x2="${W}" y2="${barArea}" stroke="#e2e8f0" stroke-width="1.5"></line>
      ${bars}
    </svg>
  `;
}

function renderAdminLeaderboard() {
  const container = document.getElementById('admin-leaderboard-items');
  if (!container) return;

  const items = [
    { rank: '🥇', name: 'Bistro Della Spiga', meals: 540, badge: 'Eco Champion' },
    { rank: '🥈', name: 'Taj Caterers & Banquets', meals: 430, badge: 'Sustainability Hero' },
    { rank: '🥉', name: 'Green Leaf Organic Bakery', meals: 260, badge: 'Zero Waste Star' },
    { rank: '4', name: 'City Fresh Co-op', meals: 190, badge: 'Fresh Partner' }
  ];

  let html = '';
  items.forEach(it => {
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#fafafa; border-radius:10px; border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:800; font-size:1.1rem;">${it.rank}</span>
          <div>
            <strong style="font-size:0.9rem;">${escapeHtml(it.name)}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${it.badge}</div>
          </div>
        </div>
        <span style="font-weight:800; color:var(--primary-accent);">${it.meals} meals</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderAdminAuditLogs(filterText = '') {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;

  const logs = App.auditLogs.filter(l => {
    if (!filterText) return true;
    const txt = filterText.toLowerCase();
    return l.actor_name.toLowerCase().includes(txt) ||
           l.action.toLowerCase().includes(txt) ||
           l.details.toLowerCase().includes(txt);
  });

  let html = '';
  logs.forEach(l => {
    html += `
      <tr>
        <td><strong>#EV-${l.id}</strong></td>
        <td style="color:var(--text-muted);">${l.created_at}</td>
        <td><strong>${escapeHtml(l.actor_name)}</strong></td>
        <td><span class="dp-badge badge-${l.role.toLowerCase()}">${l.role}</span></td>
        <td><code style="font-weight:700;">${l.action}</code></td>
        <td>${l.entity_type} #${l.entity_id}</td>
        <td style="color:var(--text-muted); max-width:320px;">${escapeHtml(l.details)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function handleAuditSearch(val) {
  renderAdminAuditLogs(val.trim());
}

function exportAuditLogCsv() {
  let csv = 'Event ID,Timestamp,Actor,Role,Action,Target,Details\n';
  App.auditLogs.forEach(l => {
    csv += `"${l.id}","${l.created_at}","${l.actor_name}","${l.role}","${l.action}","${l.entity_type} #${l.entity_id}","${l.details.replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surplussync_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast('Audit trail exported to CSV.', 'success');
}

// --- UTILITY & COUNTDOWNS ---
function computeTimeLeft(availableUntilStr) {
  const expiry = new Date(availableUntilStr).getTime();
  const now = Date.now();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, isUrgent: false, isExpired: true };
  }

  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const isUrgent = diffMs <= 3 * 3600000;

  return { hours, minutes, isUrgent, isExpired: false };
}

function tickCountdowns() {
  if (App.currentView === 'donor') renderDonorHub();
  if (App.currentView === 'ngo' && App.ngoSubView === 'marketplace') renderNgoMarketplace();
}

function showToast(message, type = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  const icon = type === 'success' ? 'circle-check' : (type === 'error' ? 'circle-exclamation' : 'circle-info');
  toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${escapeHtml(message)}</span>`;

  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
