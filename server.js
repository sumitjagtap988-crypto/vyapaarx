
const express=require("express");
const path=require("path");
const fs=require("fs");
const Database=require("better-sqlite3");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const multer=require("multer");

const app=express();
const PORT=process.env.PORT||3000;
const JWT_SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET_BEFORE_PRODUCTION";
const db=new Database(process.env.DB_FILE||path.join(__dirname,"vyapaarx.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 phone TEXT,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'buyer',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sellers(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER,
 business_name TEXT NOT NULL,
 category TEXT,
 city TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 seller_id INTEGER,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 price REAL NOT NULL,
 unit TEXT DEFAULT '/ Piece',
 moq INTEGER DEFAULT 1,
 description TEXT,
 image TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(seller_id) REFERENCES sellers(id)
);
CREATE TABLE IF NOT EXISTS enquiries(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER,
 buyer_name TEXT,
 buyer_phone TEXT,
 message TEXT,
 status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 buyer_id INTEGER,
 product_id INTEGER,
 quantity INTEGER NOT NULL,
 total REAL NOT NULL,
 status TEXT DEFAULT 'pending',
 payment_status TEXT DEFAULT 'unpaid',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const adminEmail=process.env.ADMIN_EMAIL||"admin@vyapaarx.com";
const adminPassword=process.env.ADMIN_PASSWORD||"ChangeMe123!";
if(!db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail)){
  const hash=bcrypt.hashSync(adminPassword,10);
  db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)")
    .run("VyapaarX Admin",adminEmail,hash,"admin");
}

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname));

const uploadDir=path.join(__dirname,"public","uploads");
fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({
 destination:(req,file,cb)=>cb(null,uploadDir),
 filename:(req,file,cb)=>cb(null,Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
});
const upload=multer({storage,limits:{fileSize:5*1024*1024}});

function auth(req,res,next){
 const h=req.headers.authorization||"";
 if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Login required"});
 try{req.user=jwt.verify(h.slice(7),JWT_SECRET);next()}catch(e){res.status(401).json({error:"Invalid or expired login"})}
}
function role(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:"Permission denied"});}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"VyapaarX",version:"2.0"}));

app.post("/api/auth/register",(req,res)=>{
 const {name,email,phone,password}=req.body||{};
 if(!name||!email||!password) return res.status(400).json({error:"Name, email and password are required"});
 try{
   const hash=bcrypt.hashSync(password,10);
   const info=db.prepare("INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)").run(name,email,phone||"",hash,"buyer");
   res.json({ok:true,userId:info.lastInsertRowid});
 }catch(e){res.status(409).json({error:"Email already registered"})}
});

app.post("/api/auth/login",(req,res)=>{
 const {email,password}=req.body||{};
 const u=db.prepare("SELECT * FROM users WHERE email=?").get(email||"");
 if(!u||!bcrypt.compareSync(password||"",u.password_hash)) return res.status(401).json({error:"Wrong email or password"});
 const token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},JWT_SECRET,{expiresIn:"7d"});
 res.json({ok:true,token,user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});

app.get("/api/me",auth,(req,res)=>res.json({user:req.user}));

app.post("/api/sellers",auth,(req,res)=>{
 const {business_name,category,city}=req.body||{};
 if(!business_name) return res.status(400).json({error:"Business name required"});
 const info=db.prepare("INSERT INTO sellers(user_id,business_name,category,city) VALUES(?,?,?,?)")
   .run(req.user.id,business_name,category||"",city||"");
 res.json({ok:true,sellerId:info.lastInsertRowid,status:"pending"});
});

app.post("/api/products",auth,upload.single("image"),(req,res)=>{
 const {name,category,price,unit,moq,description,seller_id}=req.body||{};
 if(!name||!category||!price) return res.status(400).json({error:"Name, category and price are required"});
 let seller;
 if(req.user.role==="admin" && seller_id) seller=db.prepare("SELECT * FROM sellers WHERE id=?").get(seller_id);
 else seller=db.prepare("SELECT * FROM sellers WHERE user_id=? ORDER BY id DESC LIMIT 1").get(req.user.id);
 if(!seller) return res.status(400).json({error:"Create a seller profile first"});
 const image=req.file?"/uploads/"+req.file.filename:"";
 const info=db.prepare(`INSERT INTO products(seller_id,name,category,price,unit,moq,description,image,status)
 VALUES(?,?,?,?,?,?,?,?,?)`).run(seller.id,name,category,Number(price),unit||"/ Piece",Number(moq||1),description||"",image,"pending");
 res.json({ok:true,productId:info.lastInsertRowid,status:"pending"});
});

app.get("/api/products",(req,res)=>{
 const {q,category,status}=req.query;
 let sql=`SELECT p.*,s.business_name,s.city FROM products p LEFT JOIN sellers s ON p.seller_id=s.id WHERE 1=1`;
 const params=[];
 if(status){sql+=" AND p.status=?";params.push(status)} else sql+=" AND p.status='approved'";
 if(category&&category!=="All"){sql+=" AND p.category=?";params.push(category)}
 if(q){sql+=" AND (p.name LIKE ? OR p.category LIKE ? OR s.business_name LIKE ?)";const x="%"+q+"%";params.push(x,x,x)}
 sql+=" ORDER BY p.id DESC";
 res.json(db.prepare(sql).all(...params));
});

app.get("/api/products/:id",(req,res)=>{
 const p=db.prepare(`SELECT p.*,s.business_name,s.city FROM products p LEFT JOIN sellers s ON p.seller_id=s.id WHERE p.id=?`).get(req.params.id);
 if(!p) return res.status(404).json({error:"Product not found"});
 res.json(p);
});

app.post("/api/enquiries",(req,res)=>{
 const {product_id,buyer_name,buyer_phone,message}=req.body||{};
 if(!product_id||!buyer_name||!buyer_phone) return res.status(400).json({error:"Product, name and phone are required"});
 const info=db.prepare("INSERT INTO enquiries(product_id,buyer_name,buyer_phone,message) VALUES(?,?,?,?)")
   .run(product_id,buyer_name,buyer_phone,message||"");
 res.json({ok:true,enquiryId:info.lastInsertRowid});
});

app.post("/api/orders",auth,(req,res)=>{
 const {product_id,quantity}=req.body||{};
 const p=db.prepare("SELECT * FROM products WHERE id=? AND status='approved'").get(product_id);
 if(!p) return res.status(404).json({error:"Product unavailable"});
 const qty=Math.max(1,Number(quantity||1));
 const total=p.price*qty;
 const info=db.prepare("INSERT INTO orders(buyer_id,product_id,quantity,total) VALUES(?,?,?,?)")
   .run(req.user.id,p.id,qty,total);
 res.json({ok:true,orderId:info.lastInsertRowid,total,payment_status:"unpaid",
  next_step:"Connect a payment gateway to mark this order paid."});
});

app.get("/api/admin/dashboard",auth,role("admin"),(req,res)=>{
 const products=db.prepare("SELECT COUNT(*) c FROM products").get().c;
 const pendingProducts=db.prepare("SELECT COUNT(*) c FROM products WHERE status='pending'").get().c;
 const sellers=db.prepare("SELECT COUNT(*) c FROM sellers").get().c;
 const pendingSellers=db.prepare("SELECT COUNT(*) c FROM sellers WHERE status='pending'").get().c;
 const enquiries=db.prepare("SELECT COUNT(*) c FROM enquiries").get().c;
 const orders=db.prepare("SELECT COUNT(*) c FROM orders").get().c;
 res.json({products,pendingProducts,sellers,pendingSellers,enquiries,orders});
});
app.get("/api/admin/products",auth,role("admin"),(req,res)=>{
 res.json(db.prepare(`SELECT p.*,s.business_name FROM products p LEFT JOIN sellers s ON p.seller_id=s.id ORDER BY p.id DESC`).all());
});
app.patch("/api/admin/products/:id",auth,role("admin"),(req,res)=>{
 const status=req.body.status;
 if(!["approved","rejected","pending"].includes(status)) return res.status(400).json({error:"Invalid status"});
 db.prepare("UPDATE products SET status=? WHERE id=?").run(status,req.params.id);
 res.json({ok:true});
});
app.get("/api/admin/sellers",auth,role("admin"),(req,res)=>res.json(db.prepare("SELECT * FROM sellers ORDER BY id DESC").all()));
app.patch("/api/admin/sellers/:id",auth,role("admin"),(req,res)=>{
 const status=req.body.status;
 if(!["approved","rejected","pending"].includes(status)) return res.status(400).json({error:"Invalid status"});
 db.prepare("UPDATE sellers SET status=? WHERE id=?").run(status,req.params.id);
 res.json({ok:true});
});

app.get("*",(req,res)=>{
 if(req.path.startsWith("/api/")) return res.status(404).json({error:"API route not found"});
 res.sendFile(path.join(__dirname,"public","index.html"));
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`VyapaarX v2 running on port ${PORT}`);
});
