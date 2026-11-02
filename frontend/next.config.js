/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.30.192.1"],
  output: 'standalone',
  async redirects() {
    return [
      {
        source: "/",
        destination: "/events",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
