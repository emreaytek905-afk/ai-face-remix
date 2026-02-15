/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for image uploads (base64 encoded images can be large)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
