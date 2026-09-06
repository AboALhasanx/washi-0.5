/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize heavy native/WASM packages so webpack does not try to bundle
  // them. The server route imports takumi-pdf which loads a WebAssembly
  // module; we want Node to resolve it at runtime, not webpack to bundle it.
  experimental: {
    serverComponentsExternalPackages: [
      "takumi-pdf",
      "pdf-parse",
      "pdfjs-dist",
      "pdfjs6",
      "@napi-rs/canvas",
      "mathjax-full",
    ],
  },
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support so any client-side WASM (e.g. via takumi-pdf
    // browser entry) compiles correctly. Server-side rendering is handled
    // through serverExternalPackages above.
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
    };
    if (!isServer) {
      config.module.rules.push({
        test: /\.wasm$/,
        type: "webassembly/async",
      });
    }
    return config;
  },
};
export default nextConfig;
