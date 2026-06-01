/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
}

// next-pwa uniquement en production
if (process.env.NODE_ENV === 'production') {
  try {
    const withPWA = require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
    })
    module.exports = withPWA(nextConfig)
  } catch (e) {
    module.exports = nextConfig
  }
} else {
  module.exports = nextConfig
}
