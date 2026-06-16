// Wait until DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // 🌙 Dark/Light Mode Toggle
  const modeToggle = document.getElementById("mode-toggle");
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    modeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // 🖼️ Carousel Auto Slide
  let index = 0;
  const images = document.querySelectorAll(".carousel img");
  function showSlide(i) {
    images.forEach((img, idx) => {
      img.style.display = idx === i ? "block" : "none";
      img.style.opacity = idx === i ? "1" : "0";
      img.style.transition = "opacity 1s ease-in-out";
    });
  }
  setInterval(() => {
    showSlide(index);
    index = (index + 1) % images.length;
  }, 4000);
  showSlide(index);

  // 🛒 Cart Counter
  let cartCount = 0;
  const cartCountElement = document.getElementById("cart-count");
  document.querySelectorAll(".product-card button:first-of-type").forEach(btn => {
    btn.addEventListener("click", () => {
      cartCount++;
      cartCountElement.textContent = cartCount;
      btn.textContent = "Added!";
      setTimeout(() => btn.textContent = "Add to Cart", 1500);
    });
  });

  // ✨ Scroll Animations for product cards
  const productCards = document.querySelectorAll(".product-card");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, { threshold: 0.2 });

  productCards.forEach(card => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = "all 0.6s ease-out";
    observer.observe(card);
  });

  // 🔍 Search Bar Filter
  const searchInput = document.querySelector(".icons input");
  searchInput.addEventListener("keyup", () => {
    const query = searchInput.value.toLowerCase();
    productCards.forEach(card => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      card.style.display = name.includes(query) ? "block" : "none";
    });
  });
});
