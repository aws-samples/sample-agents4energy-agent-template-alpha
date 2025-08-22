/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disable type checking during build to speed up builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during builds (run separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Reduce memory usage during builds
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for large dependencies
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // AWS SDK chunk (large dependency)
          aws: {
            name: 'aws',
            chunks: 'all',
            test: /node_modules\/@aws-sdk/,
            priority: 30
          },
          // LangChain chunk (large dependency)
          langchain: {
            name: 'langchain',
            chunks: 'all',
            test: /node_modules\/@langchain/,
            priority: 30
          },
          // MUI chunk (large dependency)
          mui: {
            name: 'mui',
            chunks: 'all',
            test: /node_modules\/@mui/,
            priority: 30
          }
        }
      };
    }
    
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable webpack build worker for faster builds
    webpackBuildWorker: true,
  }
};

module.exports = nextConfig;
