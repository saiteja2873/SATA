import { MongoClient } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB = process.env.MONGODB_DB || "tourism_db";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "places_embeddings";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function seedPlaces() {
  const mongoClient = new MongoClient(MONGODB_URI);
  const qdrantClient = new QdrantClient({ url: QDRANT_URL });

  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB");

    const db = mongoClient.db(MONGODB_DB);
    const placesCollection = db.collection("places");

    // Sample places data
    const samplePlaces = [
      {
        name: "Taj Mahal",
        description: "An ivory-white marble mausoleum on the right bank of the river Yamuna. One of the Seven Wonders of the World.",
        type: "monument",
        location: {
          type: "Point",
          coordinates: [78.0421, 27.1751], // [longitude, latitude]
        },
        address: "Dharmapuri, Forest Colony, Tajganj",
        city: "Agra",
        state: "Uttar Pradesh",
        country: "India",
        ratings: 4.8,
        reviews: 125000,
        entryFee: 250,
        isEntryFree: false,
        openingHours: "6:00 AM - 7:00 PM (Closed on Fridays)",
        bestTimeToVisit: {
          season: "Winter",
          months: ["October", "November", "December", "January", "February"],
          days: ["Saturday", "Sunday", "Monday"],
        },
        popularityScore: 9.8,
        tags: ["unesco", "heritage", "architecture", "mughal", "romantic"],
        amenities: ["parking", "restrooms", "guides", "cafeteria"],
      },
      {
        name: "Gateway of India",
        description: "An arch-monument built in the 20th century in Mumbai. It was erected to commemorate the landing of King-Emperor George V.",
        type: "monument",
        location: {
          type: "Point",
          coordinates: [72.8347, 18.9220],
        },
        address: "Apollo Bandar, Colaba",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        ratings: 4.5,
        reviews: 85000,
        entryFee: 0,
        isEntryFree: true,
        openingHours: "24 hours",
        bestTimeToVisit: {
          season: "Winter",
          months: ["November", "December", "January", "February"],
          days: ["Sunday", "Saturday"],
        },
        popularityScore: 8.9,
        tags: ["colonial", "architecture", "waterfront", "historic"],
        amenities: ["parking", "restrooms", "ferry rides"],
      },
      {
        name: "Red Fort",
        description: "A historic fort in Old Delhi that served as the main residence of the Mughal Emperors. UNESCO World Heritage Site.",
        type: "fort",
        location: {
          type: "Point",
          coordinates: [77.2410, 28.6562],
        },
        address: "Netaji Subhash Marg, Chandni Chowk",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        ratings: 4.6,
        reviews: 95000,
        entryFee: 35,
        isEntryFree: false,
        openingHours: "9:30 AM - 4:30 PM (Closed on Mondays)",
        bestTimeToVisit: {
          season: "Winter",
          months: ["October", "November", "December", "January", "February", "March"],
          days: ["Saturday", "Sunday"],
        },
        popularityScore: 9.2,
        tags: ["unesco", "mughal", "fort", "architecture", "museum"],
        amenities: ["parking", "guides", "museum", "light show"],
      },
      {
        name: "India Gate",
        description: "A war memorial located on Rajpath. It commemorates the 70,000 Indian soldiers who lost their lives during World War I.",
        type: "memorial",
        location: {
          type: "Point",
          coordinates: [77.2295, 28.6129],
        },
        address: "Rajpath",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        ratings: 4.7,
        reviews: 110000,
        entryFee: 0,
        isEntryFree: true,
        openingHours: "24 hours",
        bestTimeToVisit: {
          season: "Winter",
          months: ["October", "November", "December", "January", "February"],
          days: ["Sunday", "Saturday"],
        },
        popularityScore: 9.0,
        tags: ["memorial", "monument", "park", "picnic", "night_view"],
        amenities: ["parking", "gardens", "street food"],
      },
      {
        name: "Qutub Minar",
        description: "A 73-meter tall tapering tower with five distinct stories. It is the tallest brick minaret in the world and a UNESCO World Heritage Site.",
        type: "monument",
        location: {
          type: "Point",
          coordinates: [77.1855, 28.5245],
        },
        address: "Mehrauli",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        ratings: 4.5,
        reviews: 78000,
        entryFee: 30,
        isEntryFree: false,
        openingHours: "7:00 AM - 5:00 PM",
        bestTimeToVisit: {
          season: "Winter",
          months: ["October", "November", "December", "January", "February"],
          days: ["Saturday", "Sunday"],
        },
        popularityScore: 8.7,
        tags: ["unesco", "architecture", "historic", "islamic"],
        amenities: ["parking", "restrooms", "gardens"],
      },
    ];

    // Check if Qdrant collection exists, create if not
    console.log("\n🔧 Setting up Qdrant collection...");
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768, // Gemini embedding size
          distance: "Cosine",
        },
      });
      console.log(`✅ Created Qdrant collection: ${COLLECTION_NAME}`);
    } else {
      console.log(`✅ Qdrant collection already exists: ${COLLECTION_NAME}`);
    }

    // Insert places into MongoDB and Qdrant
    console.log("\n📝 Inserting places...");
    for (const place of samplePlaces) {
      // Insert into MongoDB
      const result = await placesCollection.insertOne({
        ...place,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const placeId = result.insertedId.toString();
      console.log(`✅ Inserted ${place.name} into MongoDB with ID: ${placeId}`);

      // Create embedding text
      const embeddingText = `${place.name}. ${place.description}. Type: ${place.type}. City: ${place.city}. Tags: ${place.tags?.join(", ")}`;
      
      // Generate embedding
      console.log(`   Generating embedding for ${place.name}...`);
      const embedding = await generateEmbedding(embeddingText);

      // Insert into Qdrant
      await qdrantClient.upsert(COLLECTION_NAME, {
        points: [
          {
            id: placeId,
            vector: embedding,
            payload: {
              name: place.name,
              description: place.description,
              type: place.type,
              city: place.city,
              state: place.state,
              country: place.country,
              tags: place.tags,
            },
          },
        ],
      });

      console.log(`✅ Added ${place.name} to Qdrant\n`);
    }

    console.log("\n🎉 Successfully seeded all places!");
    console.log(`📊 Total places: ${samplePlaces.length}`);

  } catch (error) {
    console.error("❌ Error seeding places:", error);
    throw error;
  } finally {
    await mongoClient.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the seeder
seedPlaces().catch(console.error);
