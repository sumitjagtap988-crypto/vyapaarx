# VyapaarX Marketplace v2

This version adds a real local backend:
- SQLite database
- Buyer registration/login
- JWT authentication
- Seller profile creation
- Seller product submission
- Image upload endpoint
- Admin dashboard with seller/product approval
- Product API
- Buyer enquiry API
- Order API starter
- Role-based admin protection

## Run
1. Install Node.js 18+.
2. `npm install`
3. Set production environment variables before launch:
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
4. `npm start`
5. Open `http://localhost:3000`

Default development admin if you do not set variables:
- Email: admin@vyapaarx.com
- Password: ChangeMe123!

CHANGE THESE before public launch.

## Still needs external account credentials
These cannot be safely hard-coded without your accounts:
- Payment gateway (Razorpay/other)
- WhatsApp Business API
- Email/SMS provider
- Domain/hosting
- Production database/backup
- Shipping/courier API

The API endpoints are structured so these integrations can be added next.
