// Applies the saved theme before paint (default light) to avoid a flash.
// Loaded via next/script beforeInteractive from the root layout.
try {
  if (localStorage.getItem("fnr-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
