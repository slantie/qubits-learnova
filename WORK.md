Missing Payment gateway in Existing flow: Instructor creates course → sets access rule (Open / On Invitation / On Payment) → Learner browses and enrolls. Do not break any existing functionality. Razorpay keys are already in .env as RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.

Course Pricing — Instructor Side
Extend the course form (Options tab) when access rule = "On Payment":

price — base course price (INR, float, already exists)
early_bird_price — discounted price for the first N students (float, optional)
early_bird_limit — number of students who get the early bird price (integer, optional)
early_bird_enrolled_count — auto-tracked counter (read-only, backend-managed)

Logic: if early_bird_limit is set and early_bird_enrolled_count < early_bird_limit, charge early_bird_price. Otherwise charge price. Compute the effective price server-side always — never trust client.

2. Coupon Code System — Admin Only
New entity Coupon:
id, code (8 hex chars uppercase, unique), courseId (nullable — null = applies to all paid courses), 
discountAmount (flat INR, float), expiresAt (datetime), 
isActive (boolean, default true), usageLimit (integer, nullable — null = unlimited), 
usedCount (integer, default 0), createdBy (adminUserId), createdAt

Code generation: cryptographically random 8 hex characters (crypto.randomBytes(4).toString('hex').toUpperCase()). Never sequential, never predictable.
Admin UI: create coupon form (select course or "all courses", flat discount amount, expiry date, optional usage limit), list view with used/limit counter, active/inactive toggle, copy-to-clipboard button.
Coupon is scoped: if courseId is set, it only applies to that course. If null, applies to any paid course.


3. Checkout Flow — Learner Side
On the course detail page, when access rule = "On Payment":

Show effective price (early bird or regular, computed server-side via GET /api/courses/:id/pricing).
Optional coupon input field — on apply, call POST /api/coupons/validate with { code, courseId }. Server returns { valid, discountAmount, finalPrice } or error. Never expose discount logic client-side.
Final price = max(0, effectivePrice - couponDiscount).
"Buy Course" button calls POST /api/payments/create-order → server creates Razorpay order with the server-computed final amount (in paise). Return { orderId, amount, currency, keyId } to client.
Open Razorpay checkout JS modal with returned values.
On payment.success callback, call POST /api/payments/verify with { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId, couponCode }.
Server verifies signature: HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, RAZORPAY_KEY_SECRET) — must match razorpaySignature. If invalid, reject with 400.
On verified: create Enrollment, increment early_bird_enrolled_count if applicable, increment coupon.usedCount if coupon was used, create Payment record (orderId, paymentId, amount, courseId, userId, couponCode, status: "success").
Redirect learner to course player.


4. Security Requirements — Non-Negotiable

All price computation happens server-side. The client sends courseId + couponCode only — never a price.
Razorpay signature verification is mandatory before enrollment. No signature = no enrollment, no exceptions.
Coupon validation checks: code exists, isActive = true, not expired (expiresAt > now()), usedCount < usageLimit (if set), courseId matches or coupon is global.
Coupon usedCount increment must be atomic (use DB transaction or atomic increment) to prevent race conditions on concurrent purchases.
Early bird counter increment must also be atomic inside the same transaction as enrollment creation.
RAZORPAY_KEY_SECRET is never sent to the client. Only RAZORPAY_KEY_ID is exposed.
All payment and coupon endpoints require authenticated session. Unauthenticated requests return 401.
Admin-only endpoints (create/toggle/delete coupon) enforce role = Admin via middleware.
Store all Payment records regardless of success/failure for audit trail.


5. New Data Entities
Payment: id, userId, courseId, razorpayOrderId, razorpayPaymentId, 
         amount (final charged, paise), couponCode (nullable), status (pending/success/failed), createdAt

Coupon: (see above)
Extend Course: add early_bird_price, early_bird_limit, early_bird_enrolled_count.

6. New API Endpoints
GET  /api/courses/:id/pricing              → { basePrice, effectivePrice, earlyBirdActive, spotsLeft }
POST /api/coupons/validate                 → { valid, discountAmount, finalPrice } (auth required)
POST /api/payments/create-order            → { orderId, amount, currency, keyId } (auth required)
POST /api/payments/verify                  → enrollment + redirect (auth required)
POST /api/admin/coupons                    → create coupon (admin only)
GET  /api/admin/coupons                    → list all coupons (admin only)
PATCH /api/admin/coupons/:id/toggle       → activate/deactivate (admin only)