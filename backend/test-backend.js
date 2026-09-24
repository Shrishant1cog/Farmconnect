// test-backend.js
const BASE_URL = 'http://localhost:5000/api';

// Simple helper to format console colors
const colors = {
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

async function runTests() {
  console.log(`${colors.cyan}==========================================`);
  console.log(`🚀 STARTING FARMCONNECT BACKEND TESTS`);
  console.log(`==========================================${colors.reset}\n`);

  try {
    // ---------------------------------------------------------
    // TEST 1: Public Market API
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 1: Fetching Public Marketplace...${colors.reset}`);
    const marketRes = await fetch(`${BASE_URL}/products`);
    const marketData = await marketRes.json();
    if (!marketRes.ok) throw new Error(marketData.message);
    
    console.log(`${colors.green}✔ Market API OK${colors.reset}`);
    console.log(`  - Found ${marketData.data.length} crops active`);
    const targetCrop = marketData.data[0];
    console.log(`  - Sample: ${targetCrop.title} at ₹${targetCrop.farmerPrice}\n`);

    // ---------------------------------------------------------
    // TEST 2: Authenticate Farmer
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 2: Authenticating Farmer (Ramesh)...${colors.reset}`);
    const farmerAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh.mandya@farmconnect.org', password: 'Password@123' })
    });
    const farmerAuthData = await farmerAuthRes.json();
    if (!farmerAuthRes.ok) throw new Error(farmerAuthData.message);
    
    const farmerToken = farmerAuthData.data.token;
    console.log(`${colors.green}✔ Farmer Login OK${colors.reset}`);
    console.log(`  - Logged in as: ${farmerAuthData.data.user.name} (FARMER)\n`);

    // ---------------------------------------------------------
    // TEST 3: Authenticate Consumer
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 3: Authenticating Consumer (Priya)...${colors.reset}`);
    const consumerAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.bengaluru@gmail.com', password: 'Password@123' })
    });
    const consumerAuthData = await consumerAuthRes.json();
    if (!consumerAuthRes.ok) throw new Error(consumerAuthData.message);
    
    const consumerToken = consumerAuthData.data.token;
    console.log(`${colors.green}✔ Consumer Login OK${colors.reset}`);
    console.log(`  - Logged in as: ${consumerAuthData.data.user.name} (CONSUMER)\n`);

    // ---------------------------------------------------------
    // TEST 4: Farmer Protected Update (Update Price)
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 4: Updating Crop Price (Farmer Action)...${colors.reset}`);
    
    // Find a crop that actually belongs to Ramesh
    const rameshCrop = marketData.data.find(c => c.farmer.user.name.includes("Ramesh"));
    
    const updateRes = await fetch(`${BASE_URL}/products/${rameshCrop.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ farmerPrice: 25.50 }) // New Price
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(updateData.message);
    
    console.log(`${colors.green}✔ Price Update OK${colors.reset}`);
    console.log(`  - Updated ${updateData.data.title}`);
    console.log(`  - New Price explicitly set to: ₹${updateData.data.farmerPrice}\n`);

    // ---------------------------------------------------------
    // TEST 5: Consumer Sends Enquiry
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 5: Consumer Submits Enquiry...${colors.reset}`);
    const enquiryRes = await fetch(`${BASE_URL}/enquiries`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        productId: rameshCrop.id,
        subject: "Can I buy 50kg this weekend?",
        message: "Hello Ramesh Ji, checking your stock availability."
      })
    });
    const enquiryData = await enquiryRes.json();
    if (!enquiryRes.ok) throw new Error(enquiryData.message);
    
    console.log(`${colors.green}✔ Enquiry Created OK${colors.reset}`);
    console.log(`  - Enquiry ID: ${enquiryData.data.id}\n`);

    // ---------------------------------------------------------
    // TEST 6: Map / Distance Engine
    // ---------------------------------------------------------
    console.log(`${colors.yellow}>> TEST 6: Testing Geo-Location & Distances...${colors.reset}`);
    // Simulate coordinates for Bengaluru
    const mapRes = await fetch(`${BASE_URL}/farmers/map?lat=12.9716&lon=77.5946`);
    const mapData = await mapRes.json();
    if (!mapRes.ok) throw new Error(mapData.message);
    
    console.log(`${colors.green}✔ Map Geo-Data OK${colors.reset}`);
    mapData.data.forEach(farm => {
      console.log(`  - ${farm.farmName} is ~${farm.distanceKm} km away`);
    });

    console.log(`\n${colors.cyan}==========================================`);
    console.log(`✅ ALL BACKEND TESTS PASSED SUCCESSFULLY!`);
    console.log(`==========================================${colors.reset}`);

  } catch (err) {
    console.log(`\n${colors.red}❌ TEST FAILED: ${err.message}${colors.reset}`);
  }
}

runTests();