import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/workflow";

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const BASE_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

export async function POST(request) {
    try {
        const { prompt, sourceImage, targetImage } = await request.json();

        if (!sourceImage || !targetImage) {
            return NextResponse.json(
                { error: "Both source and target images are required" },
                { status: 400 }
            );
        }

        if (!API_KEY || !ENDPOINT_ID) {
            return NextResponse.json(
                { error: "RunPod API credentials not configured" },
                { status: 500 }
            );
        }

        const defaultPrompt =
            "replace the face and hair in image 2 with the exact face and hair from image 1, perfect face swap, identical facial features bone structure skin texture skin tone expression eyes nose mouth lips makeup exact match, transfer precise dark hair tone highlights lowlights, long hair length style volume parting shine exact copy from image 1, strictly preserve 100% the head angle orientation tilt rotation direction gaze eye position from image 1, keep everything else 100% unchanged from image 2: pose body clothing background lighting shadows proportions environment, seamless neck hairline blend no deformation no artifacts ultra realistic high detail sharp focus natural skin pores no extra faces";

        const workflow = getWorkflow(prompt || defaultPrompt);

        const payload = {
            input: {
                workflow: workflow,
                images: [
                    {
                        name: "source_face.jpg",
                        image: sourceImage,
                    },
                    {
                        name: "target_image.jpg",
                        image: targetImage,
                    },
                ],
            },
        };

        const response = await fetch(`${BASE_URL}/run`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("RunPod Error:", errorText);
            return NextResponse.json(
                { error: `RunPod API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ jobId: data.id, status: data.status });
    } catch (error) {
        console.error("Generate API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
