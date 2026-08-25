import { Readable } from "node:stream";
import { GridFSBucket, ObjectId, type Db } from "mongodb";
import { getItineraryBuilderDb } from "@/lib/mongodb";
import type {
  TarifarioInterpretationResult,
  TarifarioSourceFile,
} from "@/lib/tarifario-interpretation";

export type TarifarioInterpretJobStatus =
  | "queued"
  | "processing"
  | "done"
  | "error";

export type TarifarioInterpretJobDocument = {
  _id?: ObjectId;
  userSub: string;
  status: TarifarioInterpretJobStatus;
  secret: string;
  files: Array<TarifarioSourceFile & { gridFsId: ObjectId }>;
  result?: TarifarioInterpretationResult | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

const JOB_COLLECTION = "TarifarioInterpretJobs";
const GRIDFS_BUCKET = "tarifario_interpret_uploads";

async function ensureTarifarioInterpretJobIndexes(db: Db) {
  await Promise.all([
    db
      .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
      .createIndex({ userSub: 1, createdAt: -1 }),
    db
      .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
      .createIndex({ status: 1, createdAt: -1 }),
    db
      .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }),
  ]);
}

function getBucket(db: Db) {
  return new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
}

async function uploadFileToGridFs(db: Db, file: File) {
  const bucket = getBucket(db);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadStream = bucket.openUploadStream(file.name || "archivo", {
    metadata: {
      source: "tarifario_interpret",
      contentType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve());
  });

  return uploadStream.id;
}

async function downloadGridFsFile(db: Db, fileId: ObjectId) {
  const bucket = getBucket(db);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    bucket
      .openDownloadStream(fileId)
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("error", reject)
      .on("end", () => resolve());
  });

  return Buffer.concat(chunks);
}

export async function createTarifarioInterpretJob(args: {
  userSub: string;
  files: File[];
}) {
  const userSub = args.userSub.trim();

  if (!userSub) {
    throw new Error("No autorizado.");
  }

  if (args.files.length === 0) {
    throw new Error("Adjunta al menos un archivo para interpretar.");
  }

  const db = await getItineraryBuilderDb();
  await ensureTarifarioInterpretJobIndexes(db);

  const storedFiles = await Promise.all(
    args.files.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      gridFsId: await uploadFileToGridFs(db, file),
    })),
  );
  const now = new Date();
  const document: TarifarioInterpretJobDocument = {
    userSub,
    status: "queued",
    secret: crypto.randomUUID(),
    files: storedFiles,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };

  const result = await db
    .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
    .insertOne(document);

  return {
    jobId: result.insertedId.toString(),
    secret: document.secret,
  };
}

export async function getTarifarioInterpretJobForUser(args: {
  jobId: string;
  userSub: string;
}) {
  if (!ObjectId.isValid(args.jobId) || !args.userSub.trim()) {
    return null;
  }

  const db = await getItineraryBuilderDb();
  await ensureTarifarioInterpretJobIndexes(db);

  return db
    .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
    .findOne({
      _id: new ObjectId(args.jobId),
      userSub: args.userSub.trim(),
    });
}

export async function claimTarifarioInterpretJob(args: {
  jobId: string;
  secret: string;
}) {
  if (!ObjectId.isValid(args.jobId) || !args.secret.trim()) {
    return null;
  }

  const db = await getItineraryBuilderDb();
  await ensureTarifarioInterpretJobIndexes(db);
  const now = new Date();

  const result = await db
    .collection<TarifarioInterpretJobDocument>(JOB_COLLECTION)
    .findOneAndUpdate(
      {
        _id: new ObjectId(args.jobId),
        secret: args.secret.trim(),
        status: { $in: ["queued", "error"] },
      },
      {
        $set: {
          status: "processing",
          error: null,
          startedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

  return result;
}

export async function loadTarifarioInterpretJobFiles(
  job: TarifarioInterpretJobDocument,
) {
  const db = await getItineraryBuilderDb();

  return Promise.all(
    job.files.map(async (file) => {
      const buffer = await downloadGridFsFile(db, file.gridFsId);
      return new File([buffer], file.name, {
        type: file.type || "application/octet-stream",
      });
    }),
  );
}

export async function completeTarifarioInterpretJob(args: {
  jobId: string;
  result: TarifarioInterpretationResult;
}) {
  const db = await getItineraryBuilderDb();
  const now = new Date();

  await db.collection<TarifarioInterpretJobDocument>(JOB_COLLECTION).updateOne(
    { _id: new ObjectId(args.jobId) },
    {
      $set: {
        status: "done",
        result: args.result,
        error: null,
        finishedAt: now,
        updatedAt: now,
      },
    },
  );
}

export async function failTarifarioInterpretJob(args: {
  jobId: string;
  error: string;
}) {
  const db = await getItineraryBuilderDb();
  const now = new Date();

  await db.collection<TarifarioInterpretJobDocument>(JOB_COLLECTION).updateOne(
    { _id: new ObjectId(args.jobId) },
    {
      $set: {
        status: "error",
        error: args.error,
        finishedAt: now,
        updatedAt: now,
      },
    },
  );
}
