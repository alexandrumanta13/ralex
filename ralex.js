const puppeteer = require("puppeteer");
const axios = require("axios");

async function scrollAndFetchProducts(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  let productData = [];

  let prevProductCount = 0;
  let currentProductCount = 0;

  do {
    prevProductCount = currentProductCount;

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for a short duration to allow content to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const productElements = await page.$$(".product-col");
    currentProductCount = productElements.length;

    if (currentProductCount > prevProductCount) {
      // Extract and append newly loaded products
      const newProducts = productElements
        .slice(prevProductCount)
        .map(async (element) => {
          return await page.evaluate((el) => {
            const name = el.querySelector(
              ".woocommerce-loop-product__title"
            ).innerText;
            const price = el.querySelector(
              ".woocommerce-Price-amount"
            ).innerText;
            const link = el.querySelector(".product-loop-title").href;
            const image = el.querySelector(".wp-post-image").src;
            const sku = el
              .querySelector(".add_to_cart_button")
              .getAttribute("data-product_sku");
            const id = el
              .querySelector(".add_to_cart_button")
              .getAttribute("data-product_id");
            const stock_status = "instock";

            return { name, price, link, stock_status, sku, id, image };
          }, element);
        });

      //   productData = [...productData, ...(await Promise.all(newProducts))];
      //   await axios.post(
      //     "https://comenzi.fabricadeasternuturi.ro/api/v2/products/ralex",
      //     { productData }
      //   );
      const products = await Promise.all(newProducts);

      // Save products to your Lumen server
      await saveProductsToLumen(products);
    }
  } while (currentProductCount > prevProductCount);

  await browser.close();

  return { totalProducts: productData.length, products: productData };
}

// Example usage:
const websiteUrl = "https://ralexpucioasa.ro/categorie-produs/lenjerii-de-pat/";
scrollAndFetchProducts(websiteUrl)
  .then((result) => {
    // console.log("Total Products:", result.totalProducts);
    console.log("Product Data:", result.products);
  })
  .catch((error) => {
    console.error(error);
  });

async function saveProductsToLumen(products) {
  try {
    const response = await axios.post(
      "https://comenzi.fabricadeasternuturi.ro/api/v2/products/ralex",
      { products }
    );
    console.log(response.data); // Log the server response for debugging
  } catch (error) {
    console.error(error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}
