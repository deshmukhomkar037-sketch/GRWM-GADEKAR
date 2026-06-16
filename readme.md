# GRWM Gadekar — Backend (Node.js + Express)

Poora backend ek single file `server.js` me hai — auth, products, cart, wishlist,
coupons, orders, newsletter aur admin APIs, sab kuch.

## Setup & Run

```bash
npm install
npm start
```

Server `http://localhost:5000` par chalega. Same server aapki frontend website
(`public/index.html`) bhi serve karta hai, so seedha browser me
`http://localhost:5000` khol sakte ho.

Data `database.json` file me persist hota hai (auto-create hoti hai pehli
baar server start karne par) — server restart karne par data delete nahi hota.

## Default Admin Login
```
email:    admin@grwm.com
password: admin123
```

## API Endpoints

**Auth**
- `POST /api/auth/register` — { name, email, password }
- `POST /api/auth/login` — { email, password }
- `GET  /api/auth/me` — header: `Authorization: Bearer <token>`

**Products**
- `GET /api/products` — query: `category, sub, search, sort, minPrice, maxPrice, tag`
- `GET /api/products/:id`
- `POST /api/products` (admin) — { name, category, sub, price, oldPrice, img, tag, description, colors, sizes, stock }
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)

**Cart** (login required)
- `GET /api/cart`
- `POST /api/cart` — { productId, qty, size, color }
- `PUT /api/cart/:productId` — { qty } or { delta }
- `DELETE /api/cart/:productId`
- `DELETE /api/cart` — clear all

**Wishlist** (login required)
- `GET /api/wishlist`
- `POST /api/wishlist/:productId` — toggle add/remove

**Coupons**
- `POST /api/coupons/validate` — { code, subtotal } (valid demo codes: `GRWM20`, `SAKSHI15`, `FIRST10`)

**Orders** (login required)
- `POST /api/orders` — { name, phone, addr1, city, state, pin, payment, couponCode }
- `GET /api/orders` — apne orders
- `GET /api/orders/:orderId`

**Newsletter**
- `POST /api/newsletter/subscribe` — { email }

**Admin** (admin login required)
- `GET /api/admin/stats` — dashboard totals
- `GET /api/admin/orders` — sab orders (optional `?status=`)
- `PUT /api/admin/orders/:orderId/status` — { status }
- `GET /api/admin/customers`
- `GET /api/admin/inventory`

## Connecting the existing frontend

Abhi `public/index.html` apna data localStorage se hi use kar raha hai
(jaisa pehle se tha). Agar aap chahte ho ki frontend ye real APIs use kare
(login, cart, orders waghera backend se), to bas bata dena — main `fetch()`
calls wire kar dunga taaki har localStorage operation backend API call ban
jaaye.