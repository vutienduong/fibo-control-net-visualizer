import './globals.css'

export const metadata = { title: 'FIBO ControlNet Visualizer' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="p-4 min-h-screen">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">FIBO ControlNet Visualizer</h1>
          <p className="text-gray-600 mt-2">Sweep FIBO JSON parameters and compare outputs.</p>
        </header>
        {children}
      </body>
    </html>
  )
}
