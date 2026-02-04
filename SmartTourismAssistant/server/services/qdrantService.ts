import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "places_embeddings";

let qdrantClient: QdrantClient | null = null;
let genAI: GoogleGenerativeAI | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({ url: QDRANT_URL });
  }
  return qdrantClient;
}

export function getEmbeddingModel() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing for embeddings");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI.getGenerativeModel({ model: "text-embedding-004" });
}

/**
 * Generate embeddings for a text query using Google's Gemini API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getEmbeddingModel();
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Search for similar places using vector similarity in Qdrant
 */
export async function searchSimilarPlaces(
  query: string,
  limit: number = 10,
  minScore: number = 0.7
) {
  try {
    const client = getQdrantClient();
    
    // Generate embedding for the query
    const queryVector = await generateEmbedding(query);
    
    // Search in Qdrant
    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryVector,
      limit,
      score_threshold: minScore,
      with_payload: true,
    });
    
    return searchResult.map(result => ({
      id: result.id,
      score: result.score,
      payload: result.payload,
    }));
  } catch (error) {
    console.error("Error searching similar places:", error);
    throw new Error("Failed to search similar places");
  }
}

/**
 * Add a place to the Qdrant collection with its embedding
 */
export async function addPlaceEmbedding(
  placeId: string,
  placeName: string,
  description: string,
  metadata: Record<string, any>
) {
  try {
    const client = getQdrantClient();
    
    // Create a combined text for embedding
    const combinedText = `${placeName}. ${description}. Type: ${metadata.type}. City: ${metadata.city}`;
    const embedding = await generateEmbedding(combinedText);
    
    // Add to Qdrant
    await client.upsert(COLLECTION_NAME, {
      points: [
        {
          id: placeId,
          vector: embedding,
          payload: {
            name: placeName,
            description,
            ...metadata,
          },
        },
      ],
    });
    
    return { success: true, placeId };
  } catch (error) {
    console.error("Error adding place embedding:", error);
    throw new Error("Failed to add place embedding");
  }
}

/**
 * Initialize the Qdrant collection if it doesn't exist
 */
export async function initializeQdrantCollection(vectorSize: number = 768) {
  try {
    const client = getQdrantClient();
    
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      // Create collection
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      });
      console.log(`✅ Created Qdrant collection: ${COLLECTION_NAME}`);
    } else {
      console.log(`✅ Qdrant collection already exists: ${COLLECTION_NAME}`);
    }
  } catch (error) {
    console.error("Error initializing Qdrant collection:", error);
    throw new Error("Failed to initialize Qdrant collection");
  }
}
