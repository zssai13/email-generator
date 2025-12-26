import './globals.css'

export const metadata = {
  title: 'Email Template Generator',
  description: 'Generate beautiful ecommerce emails with AI now',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
