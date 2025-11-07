export const metadata = { title: 'FIBO ControlNet Visualizer' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily:'ui-sans-serif, system-ui', padding: 16}}>
        <h1 style={{fontSize: 24, fontWeight: 700}}>FIBO ControlNet Visualizer</h1>
        <p style={{opacity:.7, marginBottom: 16}}>Sweep FIBO JSON parameters and compare outputs.</p>
        {children}
      </body>
    </html>
  )
}
