import express from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Create Payment Endpoint
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, product_id, success_url, fail_url } = req.body;

    // Authenticate with BOG
    const tokenRes = await axios.post(
      "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        auth: {
          username: process.env.BOG_CLIENT_ID,
          password: process.env.BOG_CLIENT_SECRET
        }
      }
    );
    const access_token = tokenRes.data.access_token;

    // Create Payment Order
    const orderRes = await axios.post(
      "https://api.bog.ge/payments/v1/ecommerce/orders",
      {
        callback_url: process.env.CALLBACK_URL,
        purchase_units: {
          currency: "GEL",
          total_amount: amount,
          basket: [
            {
              quantity: 1,
              unit_price: amount,
              product_id: product_id || "default"
            }
          ]
        },
        redirect_urls: {
          success: success_url,
          fail: fail_url
        }
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ redirect_url: orderRes.data._links.redirect.href });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Payment Callback Endpoint
app.post("/callback", (req, res) => {
  console.log("Callback from BOG:", req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
