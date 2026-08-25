import {
  claimTarifarioInterpretJob,
  completeTarifarioInterpretJob,
  failTarifarioInterpretJob,
  loadTarifarioInterpretJobFiles,
} from "@/lib/tarifario-interpret-jobs";
import { interpretTarifarioFiles } from "@/lib/tarifario-interpretation";
import { getVertexGeminiPublicErrorMessage } from "@/lib/vertex-gemini";

export async function processTarifarioInterpretJob(args: {
  jobId: string;
  secret: string;
}) {
  const job = await claimTarifarioInterpretJob(args);

  if (!job?._id) {
    return { processed: false, reason: "job_not_found_or_already_claimed" };
  }

  try {
    const apiKey =
      process.env.VERTEX_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API key de Vertex no configurada.");
    }

    const files = await loadTarifarioInterpretJobFiles(job);
    const result = await interpretTarifarioFiles({ apiKey, files });
    await completeTarifarioInterpretJob({
      jobId: job._id.toString(),
      result,
    });

    return { processed: true, status: "done" };
  } catch (error) {
    const message = getVertexGeminiPublicErrorMessage(error);
    await failTarifarioInterpretJob({
      jobId: job._id.toString(),
      error: message,
    });
    throw error;
  }
}
