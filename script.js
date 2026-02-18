document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let allProductsCache = [];
  let currentCategory = "all";

  // --- DOM ELEMENTS ---
  const categoryContainer = document.getElementById("category-container");
  const productsContainer = document.querySelector(".cards-container");
  const trendingContainer = document.getElementById("trending-container");
  const cartCountElement = document.getElementById("cart-count");
  const cartModal = document.getElementById("cart_modal");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartTotalElement = document.getElementById("cart-total-price");

  // --- INITIALIZATION ---
  updateCartUI();
  highlightActiveLink();

  // Load content based on page
  if (categoryContainer) {
    loadCategories();
    loadProducts("all");
  }

  if (trendingContainer) {
    loadTrendingProducts();
  }

  // --- GLOBAL FUNCTIONS (Exposed for onclick) ---
  
  window.addToCart = (productId, btn) => {
    // 1. Visual Feedback
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
      btn.classList.add("btn-success", "text-white");
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove("btn-success", "text-white");
      }, 1000);
    }

    // 2. Logic
    // Try finding in cache first, otherwise fetch
    let product = allProductsCache.find((p) => p.id === productId);

    if (product) {
      pushToCart(product);
    } else {
      fetch(`https://fakestoreapi.com/products/${productId}`)
        .then((res) => res.json())
        .then((data) => pushToCart(data))
        .catch((err) => console.error("Error adding to cart:", err));
    }
  };

  window.removeFromCart = (productId) => {
    cart = cart.filter((item) => item.id !== productId);
    updateCartUI();
    renderCartItems();
  };

  window.toggleCartModal = () => {
    renderCartItems();
    if (cartModal) cartModal.showModal();
  };

  window.loadProductDetails = async (id) => {
    try {
      const res = await fetch(`https://fakestoreapi.com/products/${id}`);
      const product = await res.json();
      showModal(product);
    } catch (error) {
      console.error("Error loading details:", error);
    }
  };

  // --- CORE LOGIC ---

  function pushToCart(product) {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
  }

  function updateCartUI() {
    localStorage.setItem("cart", JSON.stringify(cart));
    if (cartCountElement) {
      const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCountElement.innerText = totalCount;
      if (totalCount > 0) cartCountElement.classList.remove("hidden");
      else cartCountElement.classList.add("hidden");
    }
  }

  function renderCartItems() {
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Your cart is empty.</p>';
      if (cartTotalElement) cartTotalElement.innerText = "$0.00";
      return;
    }

    cart.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const itemDiv = document.createElement("div");
      itemDiv.className = "flex items-center gap-4 bg-base-100 p-2 rounded shadow-sm border";
      itemDiv.innerHTML = `
        <img src="${item.image}" class="w-10 h-10 object-contain" />
        <div class="flex-grow min-w-0">
          <h4 class="font-bold text-sm truncate">${item.title}</h4>
          <p class="text-xs text-gray-500">$${item.price} x ${item.quantity}</p>
        </div>
        <div class="font-bold text-sm">$${itemTotal.toFixed(2)}</div>
        <button onclick="removeFromCart(${item.id})" class="btn btn-ghost btn-xs text-red-500">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      cartItemsContainer.appendChild(itemDiv);
    });

    if (cartTotalElement) cartTotalElement.innerText = `$${total.toFixed(2)}`;
  }

  // --- API & RENDERING ---

  async function loadCategories() {
    try {
      const res = await fetch("https://fakestoreapi.com/products/categories");
      const categories = await res.json();
      
      categoryContainer.innerHTML = ""; // Clear loader/hardcoded buttons
      
      // Add 'All' button
      const allBtn = createCategoryBtn("All", "all");
      categoryContainer.appendChild(allBtn);

      categories.forEach(cat => {
        categoryContainer.appendChild(createCategoryBtn(cat, cat));
      });
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  function createCategoryBtn(text, value) {
    const btn = document.createElement("button");
    const isActive = currentCategory === value;
    btn.className = `btn rounded-full px-4 capitalize ${
        isActive ? "btn-primary text-white" : "btn-outline"
    }`;
    btn.innerText = text;
    btn.onclick = () => {
        currentCategory = value;
        loadProducts(value);
        // Update active states visually
        Array.from(categoryContainer.children).forEach(child => {
            child.classList.remove("btn-primary", "text-white");
            child.classList.add("btn-outline");
        });
        btn.classList.remove("btn-outline");
        btn.classList.add("btn-primary", "text-white");
    };
    return btn;
  }

  async function loadProducts(category) {
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '<span class="loading loading-spinner loading-lg mx-auto block my-10 col-span-full"></span>';
    
    let url = "https://fakestoreapi.com/products";
    if (category !== "all") {
      url = `https://fakestoreapi.com/products/category/${encodeURIComponent(category)}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      
      // Update cache
      data.forEach(p => {
        if (!allProductsCache.find(c => c.id === p.id)) allProductsCache.push(p);
      });

      renderProductCards(data, productsContainer);
    } catch (error) {
      productsContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Failed to load products.</p>';
    }
  }

  async function loadTrendingProducts() {
    if (!trendingContainer) return;
    
    trendingContainer.innerHTML = '<span class="loading loading-spinner loading-lg mx-auto block col-span-full"></span>';

    try {
      const res = await fetch("https://fakestoreapi.com/products");
      const data = await res.json();
      allProductsCache = data;
      
      const topRated = data.sort((a, b) => b.rating.rate - a.rating.rate).slice(0, 3);
      renderProductCards(topRated, trendingContainer);
    } catch (error) {
      console.error(error);
    }
  }

  function renderProductCards(products, container) {
    container.innerHTML = "";
    
    if (products.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center">No products found.</p>';
        return;
    }

    products.forEach((product) => {
      const card = document.createElement("div");
      // Common styling for both Grid and Trending
      card.className = "card bg-base-100 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 h-full";
      
      card.innerHTML = `
        <figure class="px-4 pt-4 h-48 bg-white relative">
          <span class="badge badge-secondary badge-sm absolute top-2 right-2 capitalize">${product.category}</span>
          <img src="${product.image}" alt="${product.title}" class="h-full object-contain" />
        </figure>
        <div class="card-body p-4 flex flex-col">
          <h2 class="card-title text-sm font-bold line-clamp-1" title="${product.title}">${product.title}</h2>
          
          <div class="flex items-center justify-between mt-2">
             <span class="text-lg font-bold text-primary">$${product.price}</span>
             <div class="flex items-center text-yellow-500 text-xs">
               <i class="fa-solid fa-star mr-1"></i> ${product.rating.rate}
             </div>
          </div>

          <div class="card-actions flex mt-auto pt-4">
             <button onclick="loadProductDetails(${product.id})" class="btn btn-sm btn-outline flex-1">Details</button>
             <button onclick="addToCart(${product.id}, this)" class="btn btn-sm btn-primary flex-1 text-white">Add</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function showModal(product) {
    const modalContainer = document.getElementById("details-modal-container");
    const modal = document.getElementById("my_modal_details");
    
    modalContainer.innerHTML = `
      <div class="modal-box w-11/12 max-w-3xl p-0 bg-white overflow-hidden">
        <div class="flex flex-col md:flex-row">
          <div class="w-full md:w-1/2 p-8 bg-gray-50 flex items-center justify-center">
            <img src="${product.image}" class="max-h-[250px] object-contain" />
          </div>
          <div class="w-full md:w-1/2 p-6 flex flex-col relative">
            <form method="dialog"><button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
            <div class="badge badge-outline mb-2 capitalize">${product.category}</div>
            <h3 class="text-xl font-bold mb-2">${product.title}</h3>
            <p class="text-sm text-gray-600 mb-4 flex-grow">${product.description}</p>
            <div class="flex items-center justify-between mb-4">
               <span class="text-2xl font-bold text-primary">$${product.price}</span>
               <span class="text-yellow-500 text-sm"><i class="fa-solid fa-star"></i> ${product.rating.rate}</span>
            </div>
            <button onclick="addToCart(${product.id}, this)" class="btn btn-primary w-full text-white">Add to Cart</button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    `;
    modal.showModal();
  }

  function highlightActiveLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".menu a").forEach((link) => {
      if (link.getAttribute("href") === currentPage) {
        link.classList.add("text-indigo-600", "font-bold");
      }
    });
  }
});