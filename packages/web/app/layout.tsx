import './globals.css'
import DarkModeToggle from './components/DarkModeToggle'

export const metadata = { title: 'FIBO ControlNet Visualizer' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="p-4 min-h-screen">
        <header className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">FIBO ControlNet Visualizer</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Sweep FIBO JSON parameters and compare outputs.</p>
            </div>
            <DarkModeToggle />
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
