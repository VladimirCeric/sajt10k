import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  // Bez Next kompresije: ona uklanja Content-Length, a Safari bez njega ne pušta audio. Kompresiju radi proksi (nginx).
  compress: false,
  // Sakriva Next.js okruglu oznaku „N“ u razvojnom režimu (ne postoji u pravoj verziji).
  devIndicators: false,
  // Otpremanje iz admina: slike (do 2 MB, do tri odjednom) i podkast snimci (do 150 MB).
  experimental: { serverActions: { bodySizeLimit: '160mb' } },
  // Audio snimci idu kroz pages/api/podkast-audio (tačan Content-Length za Safari).
  async rewrites() {
    return { beforeFiles: [{ source: '/uploads/podkast/:file', destination: '/api/podkast-audio/:file' }], afterFiles: [], fallback: [] };
  },
  // Engleski je ukinut: /en i sve ispod njega vode na ćirilicu.
  async redirects() {
    return [
      { source: '/:locale(sr-cyrl|sr-latn)/:old(archive|news|shows|schedule)/:rest*', destination: '/:locale', permanent: false },
      { source: '/en', destination: '/sr-cyrl', permanent: false },
      { source: '/en/:path*', destination: '/sr-cyrl/:path*', permanent: false },
    ];
  },
};
export default nextConfig;
