import { ThemeProvider as NextThemeProvider } from 'next-themes'

export function ThemeProvider({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem={true} storageKey="theme">
      {children}
    </NextThemeProvider>
  )
}
