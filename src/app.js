const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const axios = require("axios"); // Add axios for HTTP requests

const routes = require("./routes/main");
const apiinf = require("../api.json"); // Store API details like channel_id, key in api.json

const app = express();
mongoose.connect("mongodb://localhost:27017/water_sample")
  .then(() => console.log("MongoDB connection successful"))
  .catch((err) => console.log(err));

const hbs = require("hbs");
const tempath = path.join(__dirname, "../src/views");
const partial_path = path.join(__dirname, "../src/views/partials");
const staticPath = path.join(__dirname, "../public");

app.set('view engine', 'hbs');
app.set('views', tempath);
app.use(express.static(staticPath));
hbs.registerPartials(partial_path);

// Route to fetch ThingSpeak data in real-time
app.get("/thingspeak/alternate_uses", async (req, res) => {
  const { channel_id, read_api_key } = apiinf;
  try {

    const response = await axios.get(
      `https://api.thingspeak.com/channels/${channel_id}/feeds.json`,
      { params: { api_key: read_api_key, results: 10 } }
    );

    const feeds = response.data.feeds;
    const channelInfo = response.data.channel;

    // Perform calculations on the ThingSpeak data
    const latestFeed = feeds[feeds.length - 1];

    // Extract the latest pH and DO values
    const avgPH = parseFloat(latestFeed.field1);
    const avgDO = parseFloat(latestFeed.field2);
    const avgTUR = parseFloat(latestFeed.field3);
    const avgTE= parseFloat(latestFeed.field4);
    // Determine Water Quality Index
    let waterQualityIndex;
    if (avgPH < 6.5) {
      waterQualityIndex = "Acidic";
    } else if (avgPH <= 8.5) {
      waterQualityIndex = "Neutral";
    } else {
      waterQualityIndex = "Basic";
    }
    // Determine alternate uses
    function generateSuggestion(ph, doLevel, turbidity, temperature) {
      // pH based alternate use cases
      if (ph < 6.5) {
          if (ph >= 5.5) {
              return "Slightly acidic, use for non-sensitive plant irrigation.";
          } else if (ph >= 4.5) {
              return "Highly acidic, suitable for cleaning or flushing systems.";
          } else {
              return "Too acidic, may be used for industrial cleaning or cooling.";
          }
      } else if (ph > 8.5) {
          if (ph <= 9.5) {
              return "Slightly alkaline, suitable for landscaping or cleaning.";
          } else if (ph <= 10.5) {
              return "Highly alkaline, may be used for industrial washing or cooling.";
          } else {
              return "Too alkaline, only suitable for industrial processes.";
          }
      }
  
      // DO based alternate use cases
      if (doLevel < 6) {
          if (doLevel >= 4) {
              return "Low DO, suitable for irrigation and cleaning but not aquatic use.";
          } else {
              return "Very low DO, use for non-potable industrial processes only.";
          }
      } else if (doLevel > 8) {
          return "High DO, suitable for fish farming or aquaculture.";
      }
  
      // Turbidity based alternate use cases
      if (turbidity >= 20) {
          if (turbidity <= 50) {
              return "High turbidity, suitable for non-potable irrigation or flushing.";
          } else if (turbidity <= 100) {
              return "Very high turbidity, use for non-sensitive industrial processes.";
          } else {
              return "Extremely turbid, may be used for waste management or cleaning.";
          }
      }
  
      // Temperature based alternate use cases
      if (temperature < 10) {
          return "Low temperature, suitable for cooling systems or industrial uses.";
      } else if (temperature > 35) {
          return "High temperature, suitable for thermal industrial processes.";
      }
  
      // Default: If everything is within range
      return "Safe for drinking and household use.";
  }
    let alternateUses = [];
    alternateUses.push(generateSuggestion(avgPH,avgDO,avgTUR,avgTE))
    // if (1) {
    //   alternateUses.push("Irrigation for gardens and crops");
    //   alternateUses.push("Flushing toilets");
    //   alternateUses.push("Cleaning and washing");
    // } else if (avgPH < 6.5 || avgDO < 5 || avgDO >= 30) {
    //   alternateUses.push("Not suitable for drinking or aquatic life");
    //   alternateUses.push("Water may be used for industrial processes");
    // } else {
    //   alternateUses.push("Use cautiously; may require treatment.");
    // }

    // Pass data to the HTML template
    res.render("alternate", { feeds, avgPH, avgDO,avgTUR,avgTE, waterQualityIndex, alternateUses });
  } catch (error) {
    console.error("Error fetching data from MongoDB:", error);
    res.status(500).send("Failed to fetch simulation data.");
  }
});
app.get("/thingspeak", async (req, res) => {
  const { channel_id, read_api_key } = apiinf;

  try {
    // Fetch the latest 10 results from the ThingSpeak channel
    const response = await axios.get(
      `https://api.thingspeak.com/channels/${channel_id}/feeds.json`,
      { params: { api_key: read_api_key, results: 10 } }
    );

    const feeds = response.data.feeds; // Extract multiple data points
    const channelInfo = response.data.channel; // Channel details (optional)

    // Get the latest feed
    const latestFeed = feeds[feeds.length - 1];

    // Extract the latest pH and DO values
    const latestPH = parseFloat(latestFeed.field1);
    const latestDO = parseFloat(latestFeed.field2);

    // Render the view and pass the fetched data and the latest values
    res.render("thingspeak", {
      feeds,
      channelInfo,
      latestPH,
      latestDO
    });
  } catch (error) {
    console.error("Error fetching data from ThingSpeak:", error);
    res.status(500).send("Failed to fetch simulation data.");
  }
});

app.use("", routes);

app.listen(8000, () => {
  console.log("Server is listening on port 5000");
});
