/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.30.192.1"],

  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
