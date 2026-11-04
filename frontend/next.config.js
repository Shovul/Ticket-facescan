/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.30.192.1"],
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin/attendees",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/admin/attendees",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
