/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors. Next.js 15 has known conflicts with ESLint versions.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
