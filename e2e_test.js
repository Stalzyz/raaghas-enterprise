const { execSync } = require('child_process');

async function runTests() {
  console.log("🚀 STARTING E2E VPS PIPELINE TEST...");
  
  const BASE_URL = "http://localhost:6005/api/v1";
  const TEST_EMAIL = "qa-master-e2e@raaghas.in";

  try {
    const pRes = await fetch(`${BASE_URL}/products?limit=5`);
    const pData = await pRes.json();
    if (!Array.isArray(pData) || pData.length === 0) throw new Error("No products found");
    const variant = pData[0].variants[0];
    console.log(`✅ Fetched Product Variant: ${variant.id}`);

    const otpSendRes = await fetch(`${BASE_URL}/auth/otp/send`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    if (!otpSendRes.ok) throw new Error("Failed to send OTP");
    
    const otpQuery = `sudo -u postgres psql -d raaghas -t -c "SELECT code FROM \\"Otp\\" WHERE email='${TEST_EMAIL}' ORDER BY \\"createdAt\\" DESC LIMIT 1;"`;
    const otpCode = execSync(otpQuery).toString().trim();
    console.log(`🔑 Intercepted OTP: ${otpCode}`);

    const otpVerifyRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email: TEST_EMAIL, code: otpCode })
    });
    const authData = await otpVerifyRes.json();
    const token = authData.access_token;
    console.log("✅ Logged in successfully");

    const intentRes = await fetch(`${BASE_URL}/payments/create-intent`, {
      method: "POST", headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        items: [{ variantId: variant.id, quantity: 1 }],
        customerInfo: { name: "QA Tester", email: TEST_EMAIL, phone: "9999999999" },
        shippingAddress: { address: "123 Test St", city: "QA City", state: "Tamil Nadu", pincode: "600001" },
        billingAddress: { address: "123 Test St", city: "QA City", state: "Tamil Nadu", pincode: "600001" },
        gateway: "CASH_ON_DELIVERY", 
        shippingCost: 0,
        shippingMethodId: "test-shipping"
      })
    });
    const intentData = await intentRes.json();
    if (!intentData.id) throw new Error("Order creation failed: " + JSON.stringify(intentData));
    const orderId = intentData.id;
    console.log(`✅ Order Created: ${orderId} (Status: ${intentData.status})`);

    const orderQuery = `sudo -u postgres psql -d raaghas -t -c "SELECT status FROM \\"Order\\" WHERE id='${orderId}';"`;
    const orderStatus = execSync(orderQuery).toString().trim();
    console.log(`📊 Verified DB State: ${orderStatus}`);

    console.log("🧹 Cleaning up dummy test order...");
    execSync(`sudo -u postgres psql -d raaghas -c "DELETE FROM \\"PaymentIntent\\" WHERE \\"orderId\\"='${orderId}';"`);
    execSync(`sudo -u postgres psql -d raaghas -c "DELETE FROM \\"OrderItem\\" WHERE \\"orderId\\"='${orderId}';"`);
    execSync(`sudo -u postgres psql -d raaghas -c "DELETE FROM \\"Order\\" WHERE id='${orderId}';"`);
    execSync(`sudo -u postgres psql -d raaghas -c "DELETE FROM \\"User\\" WHERE email='${TEST_EMAIL}';"`);

    console.log("\n🎉 ALL PIPELINE TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
  }
}

runTests();
