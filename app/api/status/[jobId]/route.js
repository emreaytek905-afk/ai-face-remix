import { NextResponse } from "next/server";

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const BASE_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

export async function GET(request, { params }) {
    try {
        const { jobId } = await params;

        if (!API_KEY || !ENDPOINT_ID) {
            return NextResponse.json(
                { error: "RunPod API credentials not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`${BASE_URL}/status/${jobId}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `RunPod status error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract image from output if job is completed
        let resultImage = null;
        if (data.status === "COMPLETED" && data.output) {
            const output = data.output;

            // Check 'message' field (common single image return)
            if (
                typeof output === "object" &&
                output.message &&
                typeof output.message === "string" &&
                output.message.length > 100
            ) {
                resultImage = output.message;
            }

            // Check 'images' list
            if (!resultImage && typeof output === "object" && output.images) {
                for (const img of output.images) {
                    if (typeof img === "object") {
                        for (const [key, val] of Object.entries(img)) {
                            if (typeof val === "string" && val.length > 1000) {
                                resultImage = val;
                                break;
                            }
                        }
                    } else if (typeof img === "string" && img.length > 1000) {
                        resultImage = img;
                    }
                    if (resultImage) break;
                }
            }

            // Check simple list output
            if (!resultImage && Array.isArray(output)) {
                for (const item of output) {
                    if (typeof item === "object") {
                        for (const [key, val] of Object.entries(item)) {
                            if (typeof val === "string" && val.length > 1000) {
                                resultImage = val;
                                break;
                            }
                        }
                    }
                    if (resultImage) break;
                }
            }
        }

        return NextResponse.json({
            status: data.status,
            resultImage: resultImage,
            error: data.error || null,
        });
    } catch (error) {
        console.error("Status API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
