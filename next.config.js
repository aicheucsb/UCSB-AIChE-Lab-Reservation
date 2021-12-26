module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ucsb-aiche-lab-reservation.vercel.app/api/:path*',
      },
    ]
  },
}
