"use client";

import { useState, useRef, useCallback } from "react";

const DEFAULT_PROMPT =
  "replace the face and hair in image 2 with the exact face and hair from image 1, perfect face swap, identical facial features bone structure skin texture skin tone expression eyes nose mouth lips makeup exact match, transfer precise dark hair tone highlights lowlights, long hair length style volume parting shine exact copy from image 1, strictly preserve 100% the head angle orientation tilt rotation direction gaze eye position from image 1, keep everything else 100% unchanged from image 2: pose body clothing background lighting shadows proportions environment, seamless neck hairline blend no deformation no artifacts ultra realistic high detail sharp focus natural skin pores no extra faces";

const MAX_IMAGE_SIZE = 1200; // Max width/height in pixels to keep under Vercel body limit

function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          const ratio = Math.min(
            MAX_IMAGE_SIZE / width,
            MAX_IMAGE_SIZE / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Extract base64 without the data URI prefix
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [sourceImage, setSourceImage] = useState(null);
  const [sourcePreview, setSourcePreview] = useState(null);
  const [targetImage, setTargetImage] = useState(null);
  const [targetPreview, setTargetPreview] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [status, setStatus] = useState("idle"); // idle, submitting, processing, completed, error
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const sourceRef = useRef(null);
  const targetRef = useRef(null);
  const timerRef = useRef(null);

  const handleImageSelect = useCallback(async (file, type) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    const base64 = await resizeImage(file);

    if (type === "source") {
      setSourceImage(base64);
      setSourcePreview(preview);
    } else {
      setTargetImage(base64);
      setTargetPreview(preview);
    }
  }, []);

  const removeImage = useCallback((type) => {
    if (type === "source") {
      setSourceImage(null);
      setSourcePreview(null);
      if (sourceRef.current) sourceRef.current.value = "";
    } else {
      setTargetImage(null);
      setTargetPreview(null);
      if (targetRef.current) targetRef.current.value = "";
    }
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (jobId) => {
      const maxAttempts = 300; // 10 minutes max
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const res = await fetch(`/api/status/${jobId}`);
          const data = await res.json();

          if (data.status === "COMPLETED") {
            stopTimer();
            if (data.resultImage) {
              setResultImage(`data:image/png;base64,${data.resultImage}`);
              setStatus("completed");
            } else {
              setError("İş tamamlandı fakat görsel bulunamadı.");
              setStatus("error");
            }
            return;
          } else if (data.status === "FAILED") {
            stopTimer();
            setError(data.error || "RunPod işlemi başarısız oldu.");
            setStatus("error");
            return;
          }

          // Still processing, wait and try again
          await new Promise((r) => setTimeout(r, 2000));
          attempts++;
        } catch (err) {
          stopTimer();
          setError(`Polling hatası: ${err.message}`);
          setStatus("error");
          return;
        }
      }

      stopTimer();
      setError("İşlem zaman aşımına uğradı (10 dakika).");
      setStatus("error");
    },
    [stopTimer]
  );

  const handleGenerate = useCallback(async () => {
    if (!sourceImage || !targetImage) return;

    setStatus("submitting");
    setError(null);
    setResultImage(null);
    startTimer();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          sourceImage,
          targetImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        stopTimer();
        setError(data.error || "İş gönderilemedi");
        setStatus("error");
        return;
      }

      setStatus("processing");
      await pollStatus(data.jobId);
    } catch (err) {
      stopTimer();
      setError(`Bağlantı hatası: ${err.message}`);
      setStatus("error");
    }
  }, [sourceImage, targetImage, prompt, startTimer, stopTimer, pollStatus]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `faceswap_${Date.now()}.png`;
    link.click();
  }, [resultImage]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isProcessing = status === "submitting" || status === "processing";

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>✨ AI Face Swap</h1>
        <p>Powered by ComfyUI + Z-Image Turbo refinement on RunPod</p>
      </div>

      {/* Upload Grid */}
      <div className="upload-grid">
        {/* Source Face */}
        <div
          className={`upload-card ${sourcePreview ? "has-image" : ""}`}
          onClick={() => !isProcessing && sourceRef.current?.click()}
        >
          <input
            ref={sourceRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files[0], "source")}
            disabled={isProcessing}
          />
          {sourcePreview ? (
            <>
              <img
                src={sourcePreview}
                alt="Source face"
                className="preview-image"
              />
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage("source");
                }}
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <div className="upload-icon">🧑</div>
              <div className="upload-label">Kaynak Yüz</div>
              <div className="upload-hint">
                Yüzü alınacak görseli yükleyin
              </div>
            </>
          )}
        </div>

        {/* Target Image */}
        <div
          className={`upload-card ${targetPreview ? "has-image" : ""}`}
          onClick={() => !isProcessing && targetRef.current?.click()}
        >
          <input
            ref={targetRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files[0], "target")}
            disabled={isProcessing}
          />
          {targetPreview ? (
            <>
              <img
                src={targetPreview}
                alt="Target image"
                className="preview-image"
              />
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage("target");
                }}
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <div className="upload-icon">🖼️</div>
              <div className="upload-label">Hedef Görsel</div>
              <div className="upload-hint">
                Yüz değiştirilecek görseli yükleyin
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="prompt-section">
        <label className="prompt-label">Prompt</label>
        <textarea
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Yüz değişimi için prompt giriniz..."
          disabled={isProcessing}
        />
      </div>

      {/* Generate Button */}
      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={!sourceImage || !targetImage || isProcessing}
      >
        {isProcessing ? "⏳ İşleniyor..." : "🚀 Oluştur"}
      </button>

      {/* Progress */}
      {isProcessing && (
        <div className="progress-section">
          <div className="progress-spinner" />
          <div className="progress-status">
            {status === "submitting"
              ? "RunPod'a gönderiliyor..."
              : "GPU üzerinde işleniyor..."}
          </div>
          <div className="progress-detail">
            {status === "processing" &&
              "Face swap + Z-Image Turbo refinement"}
          </div>
          <div className="progress-timer">{formatTime(elapsed)}</div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="error-section">
          <div className="error-text">❌ {error}</div>
        </div>
      )}

      {/* Result */}
      {status === "completed" && resultImage && (
        <div className="result-section">
          <div className="result-header">
            <div className="result-title">✅ Tamamlandı</div>
            <button className="download-btn" onClick={handleDownload}>
              ⬇ İndir
            </button>
          </div>
          <img src={resultImage} alt="Result" className="result-image" />
        </div>
      )}
    </div>
  );
}
