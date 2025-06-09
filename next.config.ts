import { NextConfig } from 'next'

let userConfig = undefined
try {
    // Use dynamic import without await
    import('./v0-user-next.config').then(config => {
        userConfig = config.default
    }).catch(() => {
        // ignore error
    })
} catch (e) {
    // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
    output: 'standalone',
    eslint: {
        ignoreDuringBuilds: true,
    },

    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
    experimental: {
        webpackBuildWorker: true,
        parallelServerBuildTraces: true,
        parallelServerCompiles: true,
        optimizeCss: true,
        optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-*'],
        scrollRestoration: true,
    },
    poweredByHeader: false,
    compress: true,
    outputFileTracingIncludes: {
        '*': [
            'public/**/*',
            '.next/static/**/*',
        ],
    },
    webpack: (config, { isServer }) => {
        config.cache = true;
        
        if (!isServer && typeof config.optimization.splitChunks === 'object') {
            config.optimization.splitChunks.cacheGroups = {
                ...config.optimization.splitChunks.cacheGroups,
                styles: {
                    name: 'styles',
                    test: /\.(css|scss)$/,
                    chunks: 'all',
                    enforce: true,
                },
            };
        }

        return config;
    },
    serverExternalPackages: ['electron'], // to prevent bundling Electron
}

function mergeConfig(nextConfig: NextConfig, userConfig: any) {
    if (!userConfig) {
        return
    }

    for (const key in userConfig) {
        if (
            typeof nextConfig[key] === 'object' &&
            !Array.isArray(nextConfig[key])
        ) {
            nextConfig[key] = {
                ...nextConfig[key],
                ...userConfig[key],
            }
        } else {
            nextConfig[key] = userConfig[key]
        }
    }
}

mergeConfig(nextConfig, userConfig)

if (process.env.NODE_ENV === 'development') delete nextConfig.output; // for HMR

export default nextConfig

// const pwaConfig = {
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: true,
//   buildExcludes: [/middleware-manifest\.json$/],
//   runtimeCaching: [
//     {
//       urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'google-fonts',
//         expiration: {
//           maxEntries: 20,
//           maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
//         }
//       }
//     },
//     {
//       urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
//       handler: 'StaleWhileRevalidate',
//       options: {
//         cacheName: 'static-font-assets',
//         expiration: {
//           maxEntries: 20,
//           maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
//         }
//       }
//     }
//   ]
// }

