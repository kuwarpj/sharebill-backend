import dotenv from "dotenv";
dotenv.config(); // Ensure this is at the very top and called

import connectDB from "./config/db.js"; // Import DB connection
import app from "./app.js"; 

app.get("/", (req, res) => {
  res.send("ShareBill API is running...");
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongo db connection failed", err);
  });
