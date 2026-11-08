# SurplusSync — Food Redistribution Platform
### Final Year Project — LAMP Stack Architecture (Linux, Apache, MySQL, PHP)

> **"Connecting surplus food with those who need it most."**  
> A full-stack web redistribution platform linking commercial food donors (restaurants, caterers, bakeries) with community shelters, NGOs, and volunteer couriers to eliminate food waste and urban hunger.

---

## 🌟 Architecture & Page Flow

This platform is structured around the functional flow of **`Food-Redistribution-Platform-main` (SurplusSync)**, engineered as a complete LAMP stack system with a **3-file frontend** (`index.html`, `style.css`, `app.js`):

```
                                  ┌──────────────────────────┐
                                  │   Public Landing Page    │
                                  │ (Info, Goals, Objectives,│
                                  │  4 Steps, Differentiators│
                                  │   Stats & Testimonials)  │
                                  └────────────┬─────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 │    Authentication Flow    │
                                 │ (Sign In & Role Register) │
                                 └─────────────┬─────────────┘
                                               │
                  ┌────────────────────────────┼────────────────────────────┐
                  │                            │                            │
                  ▼                            ▼                            ▼
        ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
        │  Food Donor Hub  │         │  NGO/Shelter Hub │         │ Volunteer Courier│
        │(Bistro Spiga)    │         │(Hope Community)  │         │ (EcoRiders)      │
        ├──────────────────┤         ├──────────────────┤         ├──────────────────┤
        │• List surplus    │         │• Proximity map   │         │• Active missions │
        │• Safety checklist│         │• Marketplace feed│         │• Turn navigation │
        │• Expiry countdown│         │• Reserve claims  │         │• 6-digit OTP code│
        │• 6-digit OTP PIN │         │• Delivery OTP PIN│         │  custody transfer│
        └──────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## 🗂️ Project Directory Structure

```
FoodShare-LAMP-Final/
├── index.html                   # 3-File Frontend: Semantic HTML & View Containers
├── style.css                    # 3-File Frontend: Modern UI System & Responsive Grid
├── app.js                       # 3-File Frontend: Router, Leaflet Map, OTP, AI Auto-Fill
├── .htaccess                    # Apache URL Rewrite & Security Headers
├── config.php                   # Database & Session Configuration
├── db.php                       # Robust PDO Database Connection Engine
├── schema.sql                   # MySQL Schema & Pre-Populated Seed Data
├── api/                         # LAMP REST API Endpoints
│   ├── auth.php                 # Login, Register, Logout & Demo Switcher
│   ├── donations.php            # CRUD for Food with Proximity Radius & Role Filters
│   ├── actions.php              # State Machine (Claim, Assign, Verify Pickup/Delivery OTP)
│   ├── ai_parse.php             # Natural Language NLP Extraction Engine
│   ├── stats.php                # Environmental & Sustainability Metrics
│   ├── audit.php                # Append-Only Event Trail
│   ├── bookmarks.php            # Saved Pins Toggle & Storage
│   └── upload.php               # Secure Image Uploads (MIME validation, 5MB limit)
├── uploads/                     # Storage directory for food photography
├── docs/diagrams/               # High-res UML Diagrams (Class, Activity, Sequence, Use Case)
└── README.md                    # Complete VM Deployment & Viva Defense Guide
```

---

## 🚀 LAMP Stack Deployment Guide (Run on your VM)

### Step 1: Install Required LAMP Packages on Linux VM (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install -y apache2 mysql-server php php-mysql php-mbstring libapache2-mod-php
```

Ensure Apache and MySQL services are active:
```bash
sudo systemctl enable --now apache2
sudo systemctl enable --now mysql
```

---

### Step 2: Import the Database Schema & Seed Data

1. Open MySQL CLI:
   ```bash
   sudo mysql
   ```
2. Create the database and set user permissions:
   ```sql
   CREATE DATABASE IF NOT EXISTS foodshare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
   GRANT ALL PRIVILEGES ON foodshare_db.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Import the `schema.sql` file:
   ```bash
   mysql -u root foodshare_db < /path/to/FoodShare-LAMP-Final/schema.sql
   ```

---

### Step 3: Deploy to Apache Web Root

Copy the folder into your Apache document root:
```bash
sudo cp -r /path/to/FoodShare-LAMP-Final /var/www/html/nourishnet
```

Set appropriate directory permissions for file uploads:
```bash
sudo chown -R www-data:www-data /var/www/html/nourishnet
sudo chmod -R 775 /var/www/html/nourishnet/uploads
```

Enable Apache `mod_rewrite` and `mod_headers`:
```bash
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

---

### Step 4: Access in Browser

Open your browser and navigate to:
```
http://<YOUR_VM_IP_ADDRESS>/nourishnet/
# Example: http://192.168.1.100/nourishnet/ or http://localhost/nourishnet/
```

> **Dual-Mode Feature:** Even before MySQL is imported, `app.js` runs in full dual-mode with built-in high-fidelity seed data, so you can test all features and UI interactions immediately without errors.

---

## 👥 Built-In Personas for Presentation / Viva Defense

You can test any role with **1-click** using the top-right **"Role Switcher"** button:

| Role | Demo Persona | Organization | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Donor** | **Chef Antonio Rossi** | *Bistro Della Spiga* | List surplus food with AI Auto-Fill, inspect food safety checklists, display 6-digit pickup OTP to courier. |
| **NGO / Shelter** | **Maria Santos** | *Hope Community Kitchen* | Mandatory registration certificate upload, filter food by dietary needs, claim donations, inspect distance, receive 6-digit delivery confirmation PIN. |
| **Volunteer Courier** | **Alex Chen** | *EcoRiders Logistics* | View active courier missions, verify physical pickup with Donor's 6-digit PIN, confirm delivery at shelter. |
| **Platform Admin** | **Dr. Sarah Jenkins** | *Food Safety Board* | Review & approve pending NGO registration certificates, resolve support tickets, monitor environmental metrics, export compliance CSV. |

---

## 🔄 End-to-End Walkthrough Scenario for Viva

1. **Explore the Public Main Landing Page:**
   - Review Objectives, Goals (UN SDG 2 - Zero Hunger), 4-step redistribution cycle, differentiators, and testimonials.
2. **Sign In as Food Donor (Chef Antonio Rossi):**
   - Click **"Sign In"** $\rightarrow$ Click **"👨‍🍳 Chef (Donor)"** quick-login button.
   - Redirects to **Donor Hub**: Displays active listings, food safety badges, and real-time expiry countdowns.
   - Click **"+ List New Surplus Food"** $\rightarrow$ Click **"Hot Banquet Biryani"** sample $\rightarrow$ Click **"Auto-Fill"** $\rightarrow$ Notice how AI extracts title, category, quantity, unit, packaging, and hot temperature! Click Publish.
3. **Sign In as NGO / Shelter (Maria Santos):**
   - Click **"Role Switcher"** $\rightarrow$ select **Maria Santos (NGO)**.
   - Redirects to **Shelter Hub**:
     - Subview 1: Browse available foods in the Marketplace feed and click **"Reserve & Claim for Shelter"**.
     - Subview 2: Switch to **Discovery Map** to view food pins and adjust the proximity radius slider.
     - Subview 3: Switch to **My Reserved Claims** to see the assigned courier and your **6-digit delivery confirmation PIN**.
4. **NGO Registration & Mandatory Certificate Upload Test:**
   - Sign out $\rightarrow$ Click **"Get Started"** or **"Register"**.
   - Select **"NGO / Shelter"** role. Notice the dynamic **"Official NGO Registration Certificate (PDF or Image)"** upload section appears.
   - Choose a certificate document or keep default, enter organization details, and click Register.
   - The shelter account is created with `verification_status = 'PENDING'` and automatically routed to the Administrator's Verification Queue.
5. **Sign In as Volunteer Courier (Alex Chen):**
   - Click **"Role Switcher"** $\rightarrow$ select **Alex Chen (Volunteer)**.
   - Redirects to **Courier Hub**:
     - Toggle availability status (Online/Offline).
     - View active delivery mission with navigation directions for pickup and drop-off.
     - Click **"Enter Donor Pickup PIN"** $\rightarrow$ enter `749215` $\rightarrow$ verified! Status updates to **In Transit**.
     - Click **"Enter Shelter Delivery PIN"** $\rightarrow$ enter `381904` $\rightarrow$ confirmed! Wholesome meals distributed.
6. **Sign In as Platform Admin (Dr. Sarah Jenkins):**
   - Click **"Role Switcher"** $\rightarrow$ select **Admin**.
   - Redirects to **Admin Hub**:
     - **Tab 1 (Pending NGO Certificate Queue):** Review registered shelters, click **"View Certificate"** to inspect uploaded documentation in the modal viewer, and click **"Approve"** to authorize the shelter.
     - **Tab 2 (Live Impact & Leaderboard):** View live environmental metrics (Total meals, kg diverted, $\text{CO}_2$ prevented, trees offset), monthly SVG chart, and donor rankings.
     - **Tab 3 (Support & Grievances):** Review community logistics tickets and click **"Mark Resolved"**.
     - **Tab 4 (System Audit Trail):** Review tamper-evident event log and click **"Export Audit CSV"**.

---

## 📜 License & Acknowledgements
- Developed for University Final Year Project evaluation.
- Synthesized with the architectural best practices of **SurplusSync** and **ReTray**.
