const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Pool } = require("pg");

const app = express();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_PRODUCTION";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sellers(
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      business_name TEXT NOT NULL,
      category TEXT,
      city TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products(
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES sellers(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC NOT NULL,
      unit TEXT DEFAULT '/ Piece',
      moq INTEGER DEFAULT 1,
      description TEXT,
      image TEXT,
      images TEXT[] DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  
    CREATE TABLE IF NOT EXISTS enquiries(
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id),
      buyer_name TEXT,
      buyer_phone TEXT,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders(
      id SERIAL PRIMARY KEY,
      buyer_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      total NUMERIC NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'
  `);
  const adminEmail = process.env.ADMIN_EMAIL || "admin@vyapaarx.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const admin = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    [adminEmail]
  );

  if (admin.rowCount === 0) {
    const hash = bcrypt.hashSync(adminPassword, 10);

    await pool.query(
      `INSERT INTO users
       (name,email,password_hash,role)
       VALUES($1,$2,$3,$4)`,
      ["VyapaarX Admin", adminEmail, hash, "admin"]
    );

    console.log("Admin user created:", adminEmail);
  }
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function auth(req, res, next) {
  const h = req.headers.authorization || "";

  if (!h.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Login required"
    });
  }

  try {
    req.user = jwt.verify(
      h.slice(7),
      JWT_SECRET
    );

    next();
  } catch (e) {
    return res.status(401).json({
      error: "Invalid or expired login"
    });
  }
}

function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Permission denied"
      });
    }

    next();
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      service: "VyapaarX",
      version: "3.0",
      database: "PostgreSQL"
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Database connection failed"
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required"
      });
    }

    const hash = bcrypt.hashSync(password, 10);

    const result = await pool.query(
      `INSERT INTO users
       (name,email,phone,password_hash,role)
       VALUES($1,$2,$3,$4,'buyer')
       RETURNING id`,
      [
        name,
        email.toLowerCase().trim(),
        phone || "",
        hash
      ]
    );

    res.json({
      ok: true,
      userId: result.rows[0].id
    });

  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    console.error(e);

    res.status(500).json({
      error: "Registration failed"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [(email || "").toLowerCase().trim()]
    );

    const u = result.rows[0];

    if (
      !u ||
      !bcrypt.compareSync(
        password || "",
        u.password_hash
      )
    ) {
      return res.status(401).json({
        error: "Wrong email or password"
      });
    }

    const token = jwt.sign(
      {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

app.get("/api/me", auth, (req, res) => {
  res.json({
    user: req.user
  });
});

app.post("/api/sellers", auth, async (req, res) => {
  try {
    const {
      business_name,
      category,
      city
    } = req.body || {};

    if (!business_name) {
      return res.status(400).json({
        error: "Business name required"
      });
    }

    const result = await pool.query(
      `INSERT INTO sellers
       (user_id,business_name,category,city,status)
       VALUES($1,$2,$3,$4,'pending')
       RETURNING id,status`,
      [
        req.user.id,
        business_name,
        category || "",
        city || ""
      ]
    );

    res.json({
      ok: true,
      sellerId: result.rows[0].id,
      status: result.rows[0].status
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Seller profile creation failed"
    });
  }
});

app.post(
  "/api/products",
  auth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        name,
        category,
        price,
        unit,
        moq,
        description,
        seller_id
      } = req.body || {};

      if (!name || !category || !price) {
        return res.status(400).json({
          error: "Name, category and price are required"
        });
      }

      let seller;

      if (req.user.role === "admin" && seller_id) {
        const result = await pool.query(
          "SELECT * FROM sellers WHERE id=$1",
          [seller_id]
        );

        seller = result.rows[0];
      } else {
        const result = await pool.query(
          `SELECT *
           FROM sellers
           WHERE user_id=$1
           ORDER BY id DESC
           LIMIT 1`,
          [req.user.id]
        );

        seller = result.rows[0];
      }

      if (!seller) {
        return res.status(400).json({
          error: "Create a seller profile first"
        });
      }

      let image = "";
let images = [];

if (req.files && req.files.length > 0) {

  for (const file of req.files) {

    const result = await new Promise((resolve, reject) => {

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "vyapaarx/products"
        },
        (error, result) => {

          if (error) {
            reject(error);
          } else {
            resolve(result);
          }

        }
      );

      stream.end(file.buffer);

    });

    images.push(result.secure_url);
  }

  // First image remains the main product image
  image = images[0];
}

      const result = await pool.query(
        `INSERT INTO products
        (seller_id,name,category,price,unit,moq,description,image,images,status)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
        RETURNING id,status`,
        [
          seller.id,
          name,
          category,
          Number(price),
          unit || "/ Piece",
          Number(moq || 1),
          description || "",
image,
images
        ]
      );

      res.json({
        ok: true,
        productId: result.rows[0].id,
        status: result.rows[0].status
      });

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Product submission failed"
      });
    }
  }
);

app.get("/api/products", async (req, res) => {
  try {
    const {
      q,
      category,
      status
    } = req.query;

    let sql = `
      SELECT
        p.*,
        s.business_name,
        s.city
      FROM products p
      LEFT JOIN sellers s
        ON p.seller_id=s.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND p.status=$${params.length}`;
    } else {
      sql += ` AND p.status='approved'`;
    }

    if (category && category !== "All") {
      params.push(category);
      sql += ` AND p.category=$${params.length}`;
    }

    if (q) {
      params.push("%" + q + "%");
      const n = params.length;

      sql += `
        AND (
          p.name ILIKE $${n}
          OR p.category ILIKE $${n}
          OR s.business_name ILIKE $${n}
        )
      `;
    }

    sql += " ORDER BY p.id DESC";

    const result = await pool.query(
      sql,
      params
    );

    res.json(result.rows);

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Could not load products"
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.*,
        s.business_name,
        s.city
       FROM products p
       LEFT JOIN sellers s
       ON p.seller_id=s.id
       WHERE p.id=$1`,
      [req.params.id]
    );

    const product = result.rows[0];

    if (!product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json(product);

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Could not load product"
    });
  }
});

app.post("/api/enquiries", async (req, res) => {
  try {
    const {
      product_id,
      buyer_name,
      buyer_phone,
      message
    } = req.body || {};

    if (
      !product_id ||
      !buyer_name ||
      !buyer_phone
    ) {
      return res.status(400).json({
        error: "Product, name and phone are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO enquiries
       (product_id,buyer_name,buyer_phone,message)
       VALUES($1,$2,$3,$4)
       RETURNING id`,
      [
        product_id,
        buyer_name,
        buyer_phone,
        message || ""
      ]
    );

    res.json({
      ok: true,
      enquiryId: result.rows[0].id
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Enquiry failed"
    });
  }
});

app.post("/api/orders", auth, async (req, res) => {
  try {
    const {
      product_id,
      quantity
    } = req.body || {};

    const productResult = await pool.query(
      `SELECT *
       FROM products
       WHERE id=$1
       AND status='approved'`,
      [product_id]
    );

    const p = productResult.rows[0];

    if (!p) {
      return res.status(404).json({
        error: "Product unavailable"
      });
    }

    const qty = Math.max(
      1,
      Number(quantity || 1)
    );

    const total =
      Number(p.price) * qty;

    const result = await pool.query(
      `INSERT INTO orders
       (buyer_id,product_id,quantity,total)
       VALUES($1,$2,$3,$4)
       RETURNING id`,
      [
        req.user.id,
        p.id,
        qty,
        total
      ]
    );

    res.json({
      ok: true,
      orderId: result.rows[0].id,
      total,
      payment_status: "unpaid",
      next_step:
        "Connect a payment gateway to mark this order paid."
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Order creation failed"
    });
  }
});

app.get(
  "/api/admin/dashboard",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const products = await pool.query(
        "SELECT COUNT(*)::int AS c FROM products"
      );

      const pendingProducts = await pool.query(
        `SELECT COUNT(*)::int AS c
         FROM products
         WHERE status='pending'`
      );

      const sellers = await pool.query(
        "SELECT COUNT(*)::int AS c FROM sellers"
      );

      const pendingSellers = await pool.query(
        `SELECT COUNT(*)::int AS c
         FROM sellers
         WHERE status='pending'`
      );

      const enquiries = await pool.query(
        "SELECT COUNT(*)::int AS c FROM enquiries"
      );

      const orders = await pool.query(
        "SELECT COUNT(*)::int AS c FROM orders"
      );

      res.json({
        products: products.rows[0].c,
        pendingProducts: pendingProducts.rows[0].c,
        sellers: sellers.rows[0].c,
        pendingSellers: pendingSellers.rows[0].c,
        enquiries: enquiries.rows[0].c,
        orders: orders.rows[0].c
      });

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Dashboard failed"
      });
    }
  }
);

app.get(
  "/api/admin/products",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          p.*,
          s.business_name
         FROM products p
         LEFT JOIN sellers s
         ON p.seller_id=s.id
         ORDER BY p.id DESC`
      );

      res.json(result.rows);

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Could not load admin products"
      });
    }
  }
);

app.patch(
  "/api/admin/products/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const {
        status
      } = req.body;

      if (
        ![
          "approved",
          "rejected",
          "pending"
        ].includes(status)
      ) {
        return res.status(400).json({
          error: "Invalid status"
        });
      }

      await pool.query(
        "UPDATE products SET status=$1 WHERE id=$2",
        [
          status,
          req.params.id
        ]
      );

      res.json({
        ok: true
      });

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Product status update failed"
      });
    }
  }
);

app.get(
  "/api/admin/sellers",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM sellers ORDER BY id DESC"
      );

      res.json(result.rows);

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Could not load sellers"
      });
    }
  }
);

app.patch(
  "/api/admin/sellers/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const {
        status
      } = req.body;

      if (
        ![
          "approved",
          "rejected",
          "pending"
        ].includes(status)
      ) {
        return res.status(400).json({
          error: "Invalid status"
        });
      }

      await pool.query(
        "UPDATE sellers SET status=$1 WHERE id=$2",
        [
          status,
          req.params.id
        ]
      );

      res.json({
        ok: true
      });

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Seller status update failed"
      });
    }
  }
);

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: "API route not found"
    });
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

initDB()
  .then(() => {
    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `VyapaarX PostgreSQL v3 running on port ${PORT}`
        );
      }
    );
  })
  .catch((err) => {
    console.error(
      "Database initialization failed:",
      err
    );

    process.exit(1);
  });
