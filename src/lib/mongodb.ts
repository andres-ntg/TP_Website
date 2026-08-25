import { Db, MongoClient } from "mongodb";

const MONGO_DB_NAME = "ItineraryBuilder";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoClientPromise() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDirectUri = process.env.MONGODB_URI_DIRECT;

  if (!mongoUri) {
    throw new Error("Falta MONGODB_URI en variables de entorno.");
  }

  if (!global._mongoClientPromise) {
    global._mongoClientPromise = (async () => {
      try {
        const mongoClient = new MongoClient(mongoUri);
        return await mongoClient.connect();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isSrvDnsError =
          mongoUri.startsWith("mongodb+srv://") &&
          (message.includes("querySrv") || message.includes("ECONNREFUSED"));

        if (isSrvDnsError && mongoDirectUri) {
          const fallbackClient = new MongoClient(mongoDirectUri);
          return fallbackClient.connect();
        }

        throw error;
      }
    })();
  }

  return global._mongoClientPromise;
}

export async function getMongoDb(dbName: string): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

export async function getItineraryBuilderDb(): Promise<Db> {
  return getMongoDb(MONGO_DB_NAME);
}

export async function getSuperAgentDb(): Promise<Db> {
  return getMongoDb("SuperAgent");
}
