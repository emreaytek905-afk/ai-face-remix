/**
 * ComfyUI Face Swap + Z-Image Turbo Refinement Workflow
 * Converted from Python test_endpoint.py
 */

export function getWorkflow(prompt) {
  const randomSeed1 = Math.floor(Math.random() * 1e14);
  const randomSeed2 = Math.floor(Math.random() * 1e14);

  return {
    // ============================================
    // STAGE 1: Face Swap (Qwen Image Edit)
    // ============================================
    "1": {
      inputs: {
        ckpt_name: "Qwen-Rapid-AIO-NSFW-v21.safetensors",
      },
      class_type: "CheckpointLoaderSimple",
      _meta: { title: "Load Checkpoint" },
    },
    "2": {
      inputs: {
        seed: randomSeed1,
        steps: 4,
        cfg: 1,
        sampler_name: "sa_solver",
        scheduler: "beta",
        denoise: 0.87,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["4", 0],
        latent_image: ["9", 0],
      },
      class_type: "KSampler",
      _meta: { title: "KSampler - Face Swap" },
    },
    "3": {
      inputs: {
        prompt: prompt,
        clip: ["1", 1],
        vae: ["1", 2],
        image1: ["7", 0],
        image2: ["8", 0],
      },
      class_type: "TextEncodeQwenImageEditPlus",
      _meta: { title: "TextEncodeQwenImageEditPlus Input Prompt" },
    },
    "4": {
      inputs: {
        prompt: "\n",
        clip: ["1", 1],
        vae: ["1", 2],
      },
      class_type: "TextEncodeQwenImageEditPlus",
      _meta: { title: "TextEncodeQwenImageEditPlus Negative" },
    },
    "5": {
      inputs: {
        samples: ["2", 0],
        vae: ["1", 2],
      },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode - Face Swap Output" },
    },
    "7": {
      inputs: {
        image: "source_face.jpg",
      },
      class_type: "LoadImage",
      _meta: { title: "Source Face Image" },
    },
    "8": {
      inputs: {
        image: "target_image.jpg",
      },
      class_type: "LoadImage",
      _meta: { title: "Target Image" },
    },
    "9": {
      inputs: {
        width: 1200,
        height: 2000,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
      _meta: { title: "Final Image Size" },
    },
    // ============================================
    // STAGE 1.5: Resize before Z-Image Turbo
    // ============================================
    "18": {
      inputs: {
        images: ["5", 0],
        max_length: 2000,
      },
      class_type: "ResizeImagesByLongerEdge",
      _meta: { title: "Resize to 2000px" },
    },
    // ============================================
    // STAGE 2: Z-Image Turbo Refinement
    // ============================================
    "11": {
      inputs: {
        clip_name: "qwen_3_4b.safetensors",
        type: "lumina2",
        device: "default",
      },
      class_type: "CLIPLoader",
      _meta: { title: "Load CLIP (Z-Image Turbo)" },
    },
    "12": {
      inputs: {
        conditioning: ["20", 0],
      },
      class_type: "ConditioningZeroOut",
      _meta: { title: "ConditioningZeroOut" },
    },
    "14": {
      inputs: {
        unet_name: "z_image_turbo_bf16.safetensors",
        weight_dtype: "default",
      },
      class_type: "UNETLoader",
      _meta: { title: "Load Diffusion Model (Z-Image Turbo)" },
    },
    "16": {
      inputs: {
        vae_name: "ae.safetensors",
      },
      class_type: "VAELoader",
      _meta: { title: "Load VAE (Z-Image Turbo)" },
    },
    "19": {
      inputs: {
        pixels: ["18", 0],
        vae: ["16", 0],
      },
      class_type: "VAEEncode",
      _meta: { title: "VAE Encode - For Refinement" },
    },
    "20": {
      inputs: {
        text: "realistic skin texture, detailed pores, natural imperfections, film grain\nNegative: plastic skin, smooth plastic, airbrushed",
        clip: ["11", 0],
      },
      class_type: "CLIPTextEncode",
      _meta: { title: "CLIP Text Encode - Refinement Prompt" },
    },
    "17": {
      inputs: {
        seed: randomSeed2,
        steps: 4,
        cfg: 1,
        sampler_name: "res_multistep",
        scheduler: "simple",
        denoise: 0.15,
        model: ["14", 0],
        positive: ["20", 0],
        negative: ["12", 0],
        latent_image: ["19", 0],
      },
      class_type: "KSampler",
      _meta: { title: "KSampler - Z-Image Turbo Refinement" },
    },
    "13": {
      inputs: {
        samples: ["17", 0],
        vae: ["16", 0],
      },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode - Final Output" },
    },
    // ============================================
    // OUTPUT: Save final refined image
    // ============================================
    "10": {
      inputs: {
        filename_prefix: "runpod_api_output",
        images: ["13", 0],
      },
      class_type: "SaveImage",
      _meta: { title: "Save Image" },
    },
  };
}
