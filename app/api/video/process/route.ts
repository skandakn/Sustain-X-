import { getGeminiApiKey, transcribeVideoWithGemini } from "@/lib/gemini";
import { requireApiUser } from "@/lib/api/auth";
import { fail, handleApiError, ok } from "@/lib/api/http";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedVideo = formData.get("video");

    if (!(uploadedVideo instanceof File) || uploadedVideo.size === 0) {
      return fail("Video file is required.", 400, "video_file_required");
    }

    const auth = await requireApiUser();
    if (auth.response) return auth.response;

    if (!getGeminiApiKey()) {
      return fail("Gemini API key is not configured.", 503, "gemini_api_key_missing");
    }

    const transcription = await transcribeVideoWithGemini(uploadedVideo);
    if (!transcription) {
      return fail("Gemini could not transcribe this video. Try a shorter video or a supported video format.", 503, "gemini_transcription_failed");
    }

    return ok(
      {
        mode: auth.mode,
        video: {
          name: uploadedVideo.name,
          size: uploadedVideo.size,
          type: uploadedVideo.type
        },
        transcription
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
