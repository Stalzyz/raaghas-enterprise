# Wallet Architecture Deep Dive

I have analyzed the entire lifecycle of the wallet system in Raaghas. Here is the architectural breakdown of the wallet logic.

## 1. Credit Mechanisms (Safe)
- **Referrals (`growth.service.ts`):** When a referred user completes an order, the referrer is rewarded with a dynamic percentage of the order total. This runs inside a Prisma `$transaction`, securely increments the balance, and writes a `WalletTransaction` audit log.
- **Refunds for Returns/Exchanges (`orders.service.ts`):** When an admin processes a return and selects `WALLET` as the refund method, the system successfully performs an `upsert` with an `increment` operation and an accompanying `CREDIT` audit log.
- **Manual Adjustments (`growth.controller.ts`):** The `/wallet/adjust` endpoint is protected, allows admins to issue manual credits or debits, and correctly guards against negative balances with a `Number(updatedWallet.balance) < 0` check.

## 2. Debit Mechanisms & The "Double-Spend" Exploit (CRITICAL VULNERABILITY)
During checkout, a severe vulnerability exists in `payments.service.ts` that allows malicious users to steal products by exploiting a race condition.

### How the Exploit Works:
1. A user has a wallet balance of **₹1,000**.
2. They open **Browser Tab A**, adding ₹1,000 worth of items to the cart. They initiate checkout. The API records `walletCreditUsed = 1000`, bringing their Razorpay `netPayable` to **₹0**.
3. *Before completing the first checkout*, they open **Browser Tab B**, adding a different ₹1,000 item. They initiate checkout. The API again sees their wallet balance is ₹1,000, records `walletCreditUsed = 1000`, and sets `netPayable` to **₹0**.
4. The user completes the free checkout in Tab A. The webhook fires, deducts ₹1,000 from the wallet, and the wallet hits **₹0**.
5. The user completes the free checkout in Tab B. The webhook fires.
6. The webhook looks up the wallet balance. It sees **₹0**.
7. Because of `const toDeduct = Math.min(Number(wallet.balance), Number(order.walletCreditUsed));`, `toDeduct` becomes **0**.
8. **The webhook skips deducting the wallet but still successfully marks the order as CONFIRMED.**
9. **Result:** The user got ₹2,000 worth of goods for ₹0 by spending their ₹1,000 wallet credit twice. (This also applies to partial payments via Razorpay).

### Proposed Fix Strategy
We cannot safely "lock" the balance at the moment the checkout begins without introducing complex Cron jobs to clear abandoned checkouts (which hold user's money hostage). 
Instead, we should implement a **Late-Verification Reject**:
Inside the `_confirmOrderFromWebhook` Prisma transaction, right before we confirm the order, we check:
`if (Number(wallet.balance) < Number(order.walletCreditUsed))`
If true, the user committed double-spend fraud. We instantly abort the confirmation, mark the order as `FAILED`, write a critical `OrderActivity` log for the admin, and alert the system. The webhook returns 200 OK so Razorpay stops retrying, but the user does not get their order confirmed.
