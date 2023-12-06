const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// const serverOptions = {
//   key: fs.readFileSync("private-key.pem"),
//   cert: fs.readFileSync("certificate.pem"),
// };

// const server = https.createServer(app);

// server.listen(port, () => {
//   console.log(`Server is running on https://localhost:${port}`);
// });

// app.use(cors());

app.get("/", fetchData);

async function fetchData(req, res) {
  try {
    const websiteUrl =
      "https://ralexpucioasa.ro/categorie-produs/lenjerii-de-pat/";
    const result = await scrollAndFetchProducts(websiteUrl);

    console.log("Product Data:", result.products);
    res.send(result.products); // Sending products as the response
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}

async function scrollAndFetchProducts(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
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
      const newProducts = await Promise.all(
        productElements.slice(prevProductCount).map(async (element) => {
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
        })
      );

      productData.push(...newProducts);
    }
  } while (currentProductCount > prevProductCount);

  await browser.close();

  return { totalProducts: productData.length, products: productData };
}

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

app.listen(port, () => {
  console.log(`port: ${port}`);
});

// Export the Express API
module.exports = app;
