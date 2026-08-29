
const base=[
{id:1,name:"VyapaarX 20L Water Jar",cat:"Water & Beverage",price:65,unit:"/ Jar",rating:4.7,seller:"Sumit Aqua Solutions",verified:true,icon:"💧"},
{id:2,name:"VyapaarX Drinking Water 500ml",cat:"Water & Beverage",price:110,unit:"/ Box",rating:4.6,seller:"VyapaarX Beverages",verified:true,icon:"🧴"},
{id:3,name:"Orange Drink 600ml",cat:"Water & Beverage",price:180,unit:"/ Box",rating:4.3,seller:"Fresh Beverages",verified:true,icon:"🧃"},
{id:4,name:"Cola Drink 500ml",cat:"Water & Beverage",price:150,unit:"/ Box",rating:4.6,seller:"Fresh Beverages",verified:true,icon:"🥤"},
{id:5,name:"Healthy Mix Dry Fruits 200g",cat:"Retail Products",price:220,unit:"/ Pack",rating:4.5,seller:"Royal Retail Mart",verified:true,icon:"🥜"},
{id:6,name:"Premium Detergent Powder 1kg",cat:"Retail Products",price:110,unit:"/ Pack",rating:4.4,seller:"Shree Jee Traders",verified:true,icon:"🧼"},
{id:7,name:"Apple Juice 1 Liter",cat:"Water & Beverage",price:130,unit:"/ Box",rating:4.6,seller:"Fresh Beverages",verified:true,icon:"🍎"},
{id:8,name:"Mixed Fruit Juice 1L",cat:"Water & Beverage",price:150,unit:"/ Piece",rating:4.5,seller:"Fresh Beverages",verified:true,icon:"🧃"}
];
function data(){return base.concat(JSON.parse(localStorage.getItem("vxProducts")||"[]").map((p,i)=>({...p,id:100+i,icon:"📦",rating:4.2,verified:false})))}
function card(p){return `<article class="card"><div class="pic">${p.icon}</div><small>${p.cat}</small><h3>${p.name}</h3><div class="rating">★ ${p.rating}</div><div class="price">₹${p.price} <small>${p.unit||"/ Piece"}</small></div><small>${p.seller||p.business} ${p.verified?"✓":""}</small><div><button class="btn blue" onclick="enquiry('${p.name.replace(/'/g,"\\'")}')">Enquiry</button><a class="btn green" href="/product.html?id=${p.id}">Details</a></div></article>`}
function render(){const out=document.getElementById("products");if(!out)return;let q=(document.getElementById("search")?.value||"").toLowerCase(),cat=document.getElementById("filterCat")?.value||"All",max=+(document.getElementById("maxPrice")?.value||1000),v=document.getElementById("verified")?.checked;let a=data().filter(p=>(!q||(`${p.name} ${p.cat} ${p.seller}`).toLowerCase().includes(q))&&(cat==="All"||p.cat===cat)&&p.price<=max&&(!v||p.verified));let s=document.getElementById("sort")?.value;if(s==="low")a.sort((x,y)=>x.price-y.price);if(s==="high")a.sort((x,y)=>y.price-x.price);out.innerHTML=a.map(card).join("");let c=document.getElementById("count");if(c)c.textContent=`Showing ${a.length} products`;let t=document.getElementById("priceText");if(t)t.textContent="₹"+max}
function doSearch(){location.href="/products.html?search="+encodeURIComponent(document.getElementById("search").value)}
function enquiry(n){const msg=`Hello, I am interested in ${n}. Please share product details, price and availability.`;window.open(`https://wa.me/917045047906?text=${encodeURIComponent(msg)}`,"_blank")}search).get("id")||1),p=data().find(x=>x.id===id)||base[0],d=document.getElementById("detail");if(!d)return;d.innerHTML=`<div class="breadcrumb"><a href="/products.html">Products</a> › ${p.name}</div><div class="productbox"><div class="bigpic">${p.icon}</div><div><span class="tag">Verified Marketplace Product</span><h1>${p.name}</h1><div class="rating">★ ${p.rating} · ${p.seller||p.business}</div><div class="price" style="font-size:34px">₹${p.price} <small>${p.unit||"/ Piece"}</small></div><p>${p.description||"Quality product listed on VyapaarX marketplace."}</p><p>🛡️ Seller verification · 🚚 Delivery information · 📲 Buyer enquiry</p><button class="btn blue" onclick="enquiry('${p.name.replace(/'/g,"\\'")}')">Enquiry Now</button><a class="btn green" href="https://wa.me/917045047906">Chat on WhatsApp</a></div></div>`}
function sellerSubmit(){const f=document.getElementById("sellerForm");
                        async function productDetail() {
  const id = new URLSearchParams(location.search).get("id");
  const d = document.getElementById("detail");

  if (!d || !id) return;

  d.innerHTML = "<p>Loading product...</p>";

  try {
    const response = await fetch("/api/products/" + encodeURIComponent(id));

    if (!response.ok) {
      throw new Error("Product not found");
    }

    const p = await response.json();

    const imageHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;max-width:450px;max-height:450px;object-fit:contain;border-radius:12px;">`
      : `<div class="bigpic">${
          p.category === "Water & Beverage" ? "💧" : "🛍️"
        }</div>`;

    d.innerHTML = `
      <div class="breadcrumb">
        <a href="/products.html">Products</a> › ${p.name}
      </div>

      <div class="productbox">

        <div class="bigpic">
          ${imageHTML}
        </div>

        <div>

          <span class="tag">
            ${p.status === "approved" ? "✓ Approved Product" : "Product"}
          </span>

          <h1>${p.name}</h1>

          <div class="rating">
            ★ ${p.rating || "4.4"}
          </div>

          <p>
            <strong>Seller:</strong>
            ${p.business_name || "VyapaarX Seller"}
          </p>

          <p>
            <strong>Category:</strong>
            ${p.category}
          </p>

          <div class="price" style="font-size:34px">
            ₹${p.price}
            <small>${p.unit || "/ Piece"}</small>
          </div>

          <p>
            <strong>MOQ:</strong>
            ${p.moq || 1}
          </p>

          <p>
            ${p.description || "Quality product listed on VyapaarX marketplace."}
          </p>

          <p>
            🛡️ Verified Seller ·
            🚚 Delivery Available ·
            📲 WhatsApp Enquiry
          </p>

          <button
            class="btn blue"
            onclick="sendProductEnquiry(${p.id})">
            Enquiry Now
          </button>

          <button
            class="btn green"
            onclick="openWhatsApp(${p.id})">
            Chat on WhatsApp
          </button>

        </div>
      </div>
    `;

  } catch (error) {
    console.error(error);

    d.innerHTML = `
      <div class="notice">
        Product details could not be loaded.
        <br><br>
        <a href="/products.html">← Back to Products</a>
      </div>
    `;
  }
}


async function sendProductEnquiry(id) {

  try {

    const pResponse =
      await fetch("/api/products/" + encodeURIComponent(id));

    if (!pResponse.ok) {
      alert("Product not found");
      return;
    }

    const p = await pResponse.json();

    const name = prompt("Your name?");
    if (!name) return;

    const phone = prompt("Mobile number?");
    if (!phone) return;

    const message =
      prompt("Requirement?") || "";

    const response = await fetch(
      "/api/enquiries",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: p.id,
          buyer_name: name,
          buyer_phone: phone,
          message: message
        })
      }
    );

    if (!response.ok) {
      alert("Could not submit enquiry.");
      return;
    }

    openWhatsAppWithProduct(
      p,
      name,
      phone,
      message
    );

  } catch (error) {

    console.error(error);
    alert("Something went wrong.");

  }
}


async function openWhatsApp(id) {

  try {

    const response =
      await fetch("/api/products/" + encodeURIComponent(id));

    if (!response.ok) {
      alert("Product not found");
      return;
    }

    const p = await response.json();

    const text =
`Hello, I am interested in ${p.name}.
Product Price: ₹${p.price} ${p.unit || ""}
Seller: ${p.business_name || "VyapaarX Seller"}

Please share product details and availability.`;

    window.open(
      "https://wa.me/917045047906?text=" +
      encodeURIComponent(text),
      "_blank"
    );

  } catch (error) {

    console.error(error);
    alert("Could not open WhatsApp.");

  }
}


function openWhatsAppWithProduct(
  p,
  name,
  phone,
  message
) {

  const text =
`Hello, I am interested in ${p.name}.
Product Price: ₹${p.price} ${p.unit || ""}
Seller: ${p.business_name || "VyapaarX Seller"}

My Name: ${name}
Mobile: ${phone}
Requirement: ${message}

Please share product details and availability.`;

  window.open(
    "https://wa.me/917045047906?text=" +
    encodeURIComponent(text),
    "_blank"
  );
}
function admin(){const a=JSON.parse(localStorage.getItem("vxProducts")||"[]");const p=document.getElementById("pCount");if(p)p.textContent=data().length;const s=document.getElementById("sCount");if(s)s.textContent=a.length;const t=document.getElementById("sellerTable");if(t)t.innerHTML=a.length?`<table><tr><th>Business</th><th>Product</th><th>Category</th><th>Price</th></tr>${a.map(x=>`<tr><td>${x.business}</td><td>${x.product}</td><td>${x.category}</td><td>₹${x.price}</td></tr>`).join("")}</table>`:"<div class='notice'>No seller submissions yet.</div>"}
document.addEventListener("DOMContentLoaded",()=>{const u=new URLSearchParams(location.search);const q=u.get("search");if(q&&document.getElementById("search"))document.getElementById("search").value=q;if(document.getElementById("featured"))document.getElementById("featured").innerHTML=data().slice(0,4).map(card).join("");render();productDetail();sellerSubmit();admin()});
