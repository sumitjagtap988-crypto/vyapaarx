const base = [
  {
    id: 1,
    name: "VyapaarX 20L Water Jar",
    category: "Water & Beverage",
    price: 65,
    unit: "/ Jar",
    rating: 4.7,
    business_name: "Sumit Aqua Solutions",
    verified: true,
    icon: "💧"
  },
  {
    id: 2,
    name: "VyapaarX Drinking Water 500ml",
    category: "Water & Beverage",
    price: 110,
    unit: "/ Box",
    rating: 4.6,
    business_name: "VyapaarX Beverages",
    verified: true,
    icon: "🧴"
  },
  {
    id: 3,
    name: "Orange Drink 600ml",
    category: "Water & Beverage",
    price: 180,
    unit: "/ Box",
    rating: 4.3,
    business_name: "Fresh Beverages",
    verified: true,
    icon: "🧃"
  },
  {
    id: 4,
    name: "Cola Drink 500ml",
    category: "Water & Beverage",
    price: 150,
    unit: "/ Box",
    rating: 4.6,
    business_name: "Fresh Beverages",
    verified: true,
    icon: "🥤"
  }
];

function data() {
  return base;
}


/* =========================
   PRODUCT CARD
========================= */

function card(p) {

  const image = p.image
    ? `<img src="${p.image}"
        alt="${p.name}"
        style="width:90%;height:90%;object-fit:contain;">`
    : (p.category === "Water & Beverage" ? "💧" : "🛍️");

  return `
    <article class="card">

      <div class="pic">
        ${image}
      </div>

      <small>${p.category || ""}</small>

      <h3>${p.name}</h3>

      <div class="rating">
        ★ ${p.rating || 4.4}
      </div>

      <div class="price">
        ₹${p.price}
        <small>${p.unit || "/ Piece"}</small>
      </div>

      <small>
        ${p.business_name || p.seller || ""}
        ${p.verified ? " ✓" : ""}
      </small>

      <div>

        <button
          class="btn blue"
          onclick="enquiry(${p.id})">
          Enquiry
        </button>

        <a
          class="btn green"
          href="/product.html?id=${p.id}">
          Details
        </a>

      </div>

    </article>
  `;
}


/* =========================
   PRODUCTS PAGE
========================= */

async function render() {

  const out = document.getElementById("products");

  if (!out) return;

  try {

    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Products API failed");
    }

    let products = await response.json();

    const search =
      (document.getElementById("search")?.value || "")
        .toLowerCase();

    const category =
      document.getElementById("filterCat")?.value || "All";

    const maxPrice =
      Number(
        document.getElementById("maxPrice")?.value || 1000
      );

    products = products.filter(p => {

      const text =
        `${p.name || ""} ${p.category || ""} ${p.business_name || ""}`
          .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (category === "All" || p.category === category) &&
        Number(p.price) <= maxPrice
      );

    });

    const sort =
      document.getElementById("sort")?.value;

    if (sort === "low") {
      products.sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
    }

    if (sort === "high") {
      products.sort(
        (a, b) => Number(b.price) - Number(a.price)
      );
    }

    if (products.length === 0) {

      out.innerHTML =
        `<div class="notice">No products found.</div>`;

    } else {

      out.innerHTML =
        products.map(card).join("");

    }

    const count =
      document.getElementById("count");

    if (count) {
      count.textContent =
        `Showing ${products.length} products`;
    }

    const priceText =
      document.getElementById("priceText");

    if (priceText) {
      priceText.textContent =
        "₹" + maxPrice;
    }

  } catch (error) {

    console.error(error);

    out.innerHTML =
      `<div class="notice">
        Could not load products.
      </div>`;

  }
}


/* =========================
   PRODUCT DETAILS
========================= */

async function productDetail() {

  const detail =
    document.getElementById("detail");

  if (!detail) return;

  const params =
    new URLSearchParams(window.location.search);

  const id =
    params.get("id");

  if (!id) {

    detail.innerHTML = `
      <div class="notice">
        Product ID missing.
        <br><br>
        <a href="/products.html">
          ← Back to Products
        </a>
      </div>
    `;

    return;
  }

  detail.innerHTML =
    "<p>Loading product...</p>";

  try {

    const response =
      await fetch(
        "/api/products/" +
        encodeURIComponent(id)
      );

    if (!response.ok) {
      throw new Error("Product not found");
    }

    const p =
      await response.json();

    console.log("PRODUCT DETAILS:", p);


    /* PRODUCT IMAGE */

    let imageHTML = "";

    if (p.image) {

      imageHTML = `
        <img
          src="${p.image}"
          alt="${p.name}"
          style="
            width:100%;
            max-width:450px;
            height:400px;
            object-fit:contain;
            display:block;
            margin:auto;
          "
          onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
        >

        <div
          class="detail-icon"
          style="
            display:none;
            font-size:100px;
            text-align:center;
          ">
          ${p.category === "Water & Beverage"
            ? "💧"
            : "🛍️"}
        </div>
      `;

    } else {

      imageHTML = `
        <div
          style="
            font-size:100px;
            text-align:center;
            padding:100px 0;
          ">
          ${p.category === "Water & Beverage"
            ? "💧"
            : "🛍️"}
        </div>
      `;

    }


    detail.innerHTML = `

      <div class="breadcrumb">
        <a href="/products.html">
          Products
        </a>
        ›
        ${p.name}
      </div>


      <div class="productbox">


        <!-- PHOTO -->

        <div class="bigpic">
          ${imageHTML}
        </div>


        <!-- DETAILS -->

        <div>

          <span class="tag">
            ✓ VyapaarX Product
          </span>


          <h1>
            ${p.name}
          </h1>


          <div class="rating">
            ★ ${p.rating || "4.4"}
          </div>


          <p>
            <strong>Seller:</strong>
            ${p.business_name || "VyapaarX Seller"}
          </p>


          <p>
            <strong>Category:</strong>
            ${p.category || "-"}
          </p>


          <div
            class="price"
            style="font-size:34px">

            ₹${p.price}

            <small>
              ${p.unit || "/ Piece"}
            </small>

          </div>


          <p>
            <strong>MOQ:</strong>
            ${p.moq || 1}
          </p>


          <p>
            <strong>Description:</strong>
            <br>
            ${p.description ||
              "Quality product listed on VyapaarX marketplace."}
          </p>


          <p>
            <strong>City:</strong>
            ${p.city || "-"}
          </p>


          <p>
            🛡️ Verified Seller
            <br>
            🚚 Delivery Available
            <br>
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

    console.error(
      "Product detail error:",
      error
    );

    detail.innerHTML = `

      <div class="notice">

        <h2>
          Product details not found
        </h2>

        <p>
          Product ID: ${id}
        </p>

        <a href="/products.html">
          ← Back to Products
        </a>

      </div>

    `;

  }
}


/* =========================
   ENQUIRY
========================= */

async function sendProductEnquiry(id) {

  try {

    const response =
      await fetch(
        "/api/products/" +
        encodeURIComponent(id)
      );

    if (!response.ok) {

      alert("Product not found.");

      return;
    }

    const p =
      await response.json();


    const name =
      prompt("Your name?");

    if (!name) return;


    const phone =
      prompt("Mobile number?");

    if (!phone) return;


    const message =
      prompt("Requirement?") || "";


    const enquiry =
      await fetch(
        "/api/enquiries",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            product_id: p.id,

            buyer_name: name,

            buyer_phone: phone,

            message: message

          })

        }
      );


    if (!enquiry.ok) {

      alert(
        "Could not submit enquiry."
      );

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

    alert(
      "Something went wrong."
    );

  }

}


/* =========================
   WHATSAPP
========================= */

async function openWhatsApp(id) {

  try {

    const response =
      await fetch(
        "/api/products/" +
        encodeURIComponent(id)
      );

    if (!response.ok) {

      alert("Product not found.");

      return;
    }

    const p =
      await response.json();


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

    alert(
      "Could not open WhatsApp."
    );

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


/* =========================
   SEARCH
========================= */

function doSearch() {

  const input =
    document.getElementById("search");

  if (!input) return;

  location.href =
    "/products.html?search=" +
    encodeURIComponent(input.value);

}


/* =========================
   PAGE LOAD
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const params =
      new URLSearchParams(
        window.location.search
      );


    const search =
      params.get("search");


    const searchBox =
      document.getElementById("search");


    if (
      search &&
      searchBox
    ) {

      searchBox.value =
        search;

    }


    /* Products page */

    render();


    /* Product details page */

    productDetail();

  }
);
    
