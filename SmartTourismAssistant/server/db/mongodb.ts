import { MongoClient, Db } from "mongodb";

let cachedDb: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "tourism_db";

  const client = new MongoClient(uri);
  await client.connect();
  
  cachedDb = client.db(dbName);
  console.log(`✅ Connected to MongoDB: ${dbName}`);
  
  return cachedDb;
}

export interface Place {
  _id?: string;
  name: string;
  description: string;
  type: string; // e.g., "monument", "museum", "park", etc.
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  city: string;
  state?: string;
  country: string;
  ratings?: number;
  reviews?: number;
  entryFee?: number;
  isEntryFree?: boolean;
  openingHours?: string;
  bestTimeToVisit?: {
    season?: string;
    months?: string[];
    days?: string[];
  };
  popularityScore?: number;
  tags?: string[];
  images?: string[];
  amenities?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getPlacesCollection() {
  const db = await connectToMongoDB();
  return db.collection<Place>("places");
}
